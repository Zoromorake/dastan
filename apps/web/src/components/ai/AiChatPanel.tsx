import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { Brain, MessageSquare, MoreHorizontal, PanelRightClose, Plus, X } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ScreenplayDocumentRecord, ScreenplayWorkspaceData } from '../../types';
import { createDefaultWorkspaceData } from '../../types';
import { useAiChat, type AiChatContextMode } from '../../hooks/useAiChat';
import { listChatThreads } from '../../utils/ai-memory-storage';
import type { AiChatThread } from '../../utils/ai-memory-storage';
import type { CollaboratorPresence } from '@dastan/plugin-api';
import {
	loadInteractionMode,
	saveInteractionMode,
	type AiInteractionMode,
} from '../../utils/ai-interaction-mode';
import { formatWorkspaceSummary } from '../../utils/ai-context';
import { toPlainTextScreenplay } from '../../utils/screenplay-text';
import { looksLikeScreenplayText } from '../../utils/insert-screenplay-text';
import { GENERAL_CHAT_DOCUMENT_ID } from '../../utils/user-settings';
import { AiChatInput } from './AiChatInput';
import { AiChatMessages } from './AiChatMessages';
import { AiChatThreadSidebar } from './AiChatThreadSidebar';
import { AiMemoryDrawer } from './AiMemoryDrawer';
import { useDastanApp } from '../../context/DastanAppProvider';
import { executeAiTool } from '../../utils/ai-tool-executor';
import { formatToolPreview, type ToolInvocationPreview } from '../../utils/ai-tool-preview';
import { useEditorCommands } from '../../context/EditorCommandContext';
import { useScreenplayStore } from '../../store';
import { getEditorTheme } from '../../utils/editor-theme';

const PANEL_WIDTH_STORAGE_KEY = 'dastan.ai-panel-width';
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 560;
const DEFAULT_PANEL_WIDTH = 360;
/** Minimum character count before treating an assistant reply as "content to write", not just chat. */
const AUTO_INSERT_MIN_LENGTH = 300;

function getUiMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
	return message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text ?? '')
		.join('');
}

function shouldAutoInsert(text: string): boolean {
	const trimmed = text.trim();

	if (trimmed.length < AUTO_INSERT_MIN_LENGTH) {
		return false;
	}

	return looksLikeScreenplayText(trimmed);
}

function loadPanelWidth(): number {
	if (typeof window === 'undefined') {
		return DEFAULT_PANEL_WIDTH;
	}

	const stored = window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
	const parsed = stored ? Number(stored) : Number.NaN;

	if (Number.isFinite(parsed) && parsed >= MIN_PANEL_WIDTH && parsed <= MAX_PANEL_WIDTH) {
		return parsed;
	}

	return DEFAULT_PANEL_WIDTH;
}

function makeTabId(): string {
	return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

interface ChatTab {
	id: string;
	/** Stable useChat session id — never changes for this tab. */
	sessionId: string;
	threadId: string | null;
	/** false = auto-load latest thread; true = keep as blank new chat */
	isNew: boolean;
	title: string;
}

function createChatTab(title = 'New Chat', isNew = false): ChatTab {
	return {
		id: makeTabId(),
		sessionId: globalThis.crypto.randomUUID(),
		threadId: null,
		isNew,
		title,
	};
}

interface AiChatPanelProps {
	open: boolean;
	variant: 'hub' | 'editor';
	resolvedTheme: 'light' | 'dark';
	onClose: () => void;
	onOpenSettings?: () => void;
	selectionText?: string;
	scriptContext?: {
		documentId: string;
		projectId?: string;
		documentTitle: string;
		documentContent: JSONContent | null;
		workspace: ScreenplayWorkspaceData;
	};
	libraryDocuments?: ScreenplayDocumentRecord[];
	selectedScriptId?: string | null;
	pendingPrompt?: string | null;
	onPendingPromptHandled?: () => void;
	/** Collaboration room id for shared AI threads (editor variant). */
	collaborationRoomId?: string | null;
	activeCollaborators?: CollaboratorPresence[];
	activeWorkspaceTab?: string | null;
}

export function AiChatPanel({
	open,
	variant,
	resolvedTheme,
	onClose,
	onOpenSettings,
	selectionText,
	scriptContext,
	libraryDocuments = [],
	selectedScriptId = null,
	pendingPrompt = null,
	onPendingPromptHandled,
	collaborationRoomId = null,
	activeCollaborators = [],
	activeWorkspaceTab = null,
}: AiChatPanelProps) {
	const isDark = resolvedTheme === 'dark';
	const editorTheme = getEditorTheme(isDark);
	const editorCommands = useEditorCommands();
	const { entitlements, storage } = useDastanApp();
	const currentDocument = useScreenplayStore((state) => state.currentDocument);

	// ── Tab state ──────────────────────────────────────────────────────────────
	const [openTabs, setOpenTabs] = useState<ChatTab[]>(() => [createChatTab()]);
	const [activeTabId, setActiveTabId] = useState(() => openTabs[0]?.id ?? 'initial');

	const activeTab = openTabs.find((t) => t.id === activeTabId) ?? openTabs[0]!;
	const activeThreadId = activeTab.threadId;
	const activeChatSessionId = activeTab.sessionId;

	// ── Other state ────────────────────────────────────────────────────────────
	const [threadRefreshKey, setThreadRefreshKey] = useState(0);
	const [memoryDrawerOpen, setMemoryDrawerOpen] = useState(false);
	const [threadSidebarOpen, setThreadSidebarOpen] = useState(false);
	const contextMode: AiChatContextMode = variant === 'hub' ? 'general' : 'script';
	const [interactionMode, setInteractionMode] = useState<AiInteractionMode>(() =>
		loadInteractionMode(variant === 'editor' ? 'planner' : 'ask'),
	);
	const [overrideSelectionText, setOverrideSelectionText] = useState<string | null>(null);
	const [longConversationBannerDismissed, setLongConversationBannerDismissed] = useState(false);
	const [autoInsertedMessageId, setAutoInsertedMessageId] = useState<string | null>(null);
	const [pendingToolReview, setPendingToolReview] = useState<ToolInvocationPreview[] | null>(null);
	const acceptPendingTools = useCallback(async () => {
		if (!pendingToolReview?.length || !editorCommands) {
			return;
		}

		if (currentDocument) {
			await storage.versions.saveSnapshot(currentDocument);
		}

		for (const preview of pendingToolReview) {
			executeAiTool(preview.toolName, preview.input, editorCommands);
		}

		setPendingToolReview(null);
	}, [currentDocument, editorCommands, pendingToolReview, storage]);

	const rejectPendingTools = useCallback(() => {
		setPendingToolReview(null);
	}, []);

	const snapshotBeforeEditorInsert = useCallback(async () => {
		if (currentDocument) {
			await storage.versions.saveSnapshot(currentDocument);
		}
	}, [currentDocument, storage]);
	const autoInsertHandledIdsRef = useRef<Set<string>>(new Set());
	const prevChatStatusRef = useRef<'submitted' | 'streaming' | 'ready' | 'error'>('ready');
	const [panelWidth, setPanelWidth] = useState(loadPanelWidth);
	const [isWideLayout, setIsWideLayout] = useState(
		() => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches,
	);
	const isResizingRef = useRef(false);
	const panelWidthRef = useRef(panelWidth);

	// ── Script / context ───────────────────────────────────────────────────────
	const hubScriptDocument = useMemo(() => {
		if (!selectedScriptId) {
			return null;
		}

		return libraryDocuments.find((document) => document.id === selectedScriptId) ?? null;
	}, [libraryDocuments, selectedScriptId]);

	const activeScriptContext = useMemo(() => {
		if (contextMode === 'general') {
			return null;
		}

		if (variant === 'editor' && scriptContext) {
			return scriptContext;
		}

		if (hubScriptDocument) {
			return {
				documentId: hubScriptDocument.id,
				projectId: hubScriptDocument.projectId,
				documentTitle: hubScriptDocument.title,
				documentContent: hubScriptDocument.content,
				workspace: hubScriptDocument.workspace ?? createDefaultWorkspaceData(),
			};
		}

		return scriptContext ?? null;
	}, [contextMode, hubScriptDocument, scriptContext, variant]);

	const effectiveSelectionText =
		overrideSelectionText !== null ? overrideSelectionText || undefined : selectionText;

	useEffect(() => {
		setOverrideSelectionText(null);
	}, [selectionText]);

	useEffect(() => {
		setAutoInsertedMessageId(null);
	}, [activeTabId]);

	const threadDocumentId =
		contextMode === 'general'
			? GENERAL_CHAT_DOCUMENT_ID
			: (activeScriptContext?.documentId ?? GENERAL_CHAT_DOCUMENT_ID);

	// ── Load latest thread into the initial / non-new tab ─────────────────────
	useEffect(() => {
		if (activeTab.threadId !== null || activeTab.isNew) {
			return;
		}

		void listChatThreads(threadDocumentId).then((threads) => {
			const latest = threads[0];
			setOpenTabs((tabs) =>
				tabs.map((t) =>
					t.id === activeTabId
						? { ...t, threadId: latest?.id ?? null, title: latest?.title ?? 'New Chat' }
						: t,
				),
			);
		});
	}, [activeTabId, threadDocumentId, activeTab.isNew, activeTab.threadId]);

	// ── Thread callbacks ───────────────────────────────────────────────────────
	const handleThreadChange = useCallback(
		(thread: AiChatThread) => {
			setOpenTabs((tabs) =>
				tabs.map((t) =>
					t.id === activeTabId ? { ...t, threadId: thread.id, title: thread.title, isNew: false } : t,
				),
			);
			setThreadRefreshKey((k) => k + 1);
		},
		[activeTabId],
	);

	const handleThreadCreated = useCallback(
		(thread: AiChatThread) => {
			setOpenTabs((tabs) =>
				tabs.map((t) =>
					t.id === activeTabId ? { ...t, threadId: thread.id, title: thread.title, isNew: false } : t,
				),
			);
			setThreadRefreshKey((k) => k + 1);
		},
		[activeTabId],
	);

	// ── useAiChat ──────────────────────────────────────────────────────────────
	const chat = useAiChat({
		contextMode,
		interactionMode,
		chatSessionId: activeChatSessionId,
		threadDocumentId,
		projectId: activeScriptContext?.projectId,
		documentId: activeScriptContext?.documentId ?? GENERAL_CHAT_DOCUMENT_ID,
		documentTitle: activeScriptContext?.documentTitle ?? 'Library',
		documentContent: activeScriptContext?.documentContent ?? null,
		workspace: activeScriptContext?.workspace ?? createDefaultWorkspaceData(),
		libraryDocuments,
		threadId: activeThreadId,
		roomId: collaborationRoomId,
		activeCollaborators,
		panelOpen: open,
		selectionText: effectiveSelectionText ?? null,
		activeWorkspaceTab,
		onToolInvocations: (invocations) => {
			if (invocations.length === 0) {
				return;
			}

			setPendingToolReview(invocations.map((invocation) => formatToolPreview(invocation.toolName, invocation.input)));
		},
		onThreadChange: handleThreadChange,
		onThreadCreated: handleThreadCreated,
	});

	useEffect(() => {
		if (open) {
			chat.refreshSettings();
		}
	}, [chat.refreshSettings, open]);

	// ── Auto-insert long-form script output in Writer mode ────────────────────
	useEffect(() => {
		const prevStatus = prevChatStatusRef.current;
		prevChatStatusRef.current = chat.status;

		const justFinished = (prevStatus === 'streaming' || prevStatus === 'submitted') && chat.status === 'ready';

		if (!justFinished || variant !== 'editor' || interactionMode !== 'planner' || !editorCommands) {
			return;
		}

		const lastMessage = chat.messages.at(-1);

		if (
			!lastMessage ||
			lastMessage.role !== 'assistant' ||
			autoInsertHandledIdsRef.current.has(lastMessage.id)
		) {
			return;
		}

		autoInsertHandledIdsRef.current.add(lastMessage.id);
		const text = getUiMessageText(lastMessage);

		if (!shouldAutoInsert(text)) {
			return;
		}

		void (async () => {
			if (currentDocument) {
				await storage.versions.saveSnapshot(currentDocument);
			}

			editorCommands.insertAtCursor(text);
			setAutoInsertedMessageId(lastMessage.id);
		})();
	}, [chat.messages, chat.status, currentDocument, editorCommands, interactionMode, storage, variant]);

	const handleUndoAutoInsert = useCallback(() => {
		if (!editorCommands) {
			return;
		}

		editorCommands.undoLastInsert();
		setAutoInsertedMessageId(null);
	}, [editorCommands]);

	useEffect(() => {
		const prompt = pendingPrompt?.trim();

		if (!open || !prompt || chat.status === 'streaming' || chat.status === 'submitted') {
			return;
		}

		void chat.submitMessage(prompt).then(() => {
			onPendingPromptHandled?.();
		});
	}, [chat.status, chat.submitMessage, onPendingPromptHandled, open, pendingPrompt]);

	// ── Keyboard shortcuts ─────────────────────────────────────────────────────
	useEffect(() => {
		if (!open) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') {
				return;
			}

			if (memoryDrawerOpen) {
				setMemoryDrawerOpen(false);
				return;
			}

			if (threadSidebarOpen) {
				setThreadSidebarOpen(false);
				return;
			}

			onClose();
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [memoryDrawerOpen, onClose, open, threadSidebarOpen]);

	// ── Context token estimates ────────────────────────────────────────────────
	const selectionActive = Boolean(effectiveSelectionText?.trim());

	const scriptCharCount = useMemo(() => {
		if (
			contextMode !== 'script' ||
			!chat.effectiveIncludeScriptContext ||
			!activeScriptContext?.documentContent
		) {
			return 0;
		}

		return toPlainTextScreenplay(activeScriptContext.documentContent).length;
	}, [activeScriptContext?.documentContent, chat.effectiveIncludeScriptContext, contextMode]);

	const workspaceSummaryCharCount = useMemo(() => {
		if (contextMode !== 'script' || !chat.includeWorkspaceContext || !activeScriptContext?.workspace) {
			return 0;
		}

		return formatWorkspaceSummary(activeScriptContext.workspace).length;
	}, [activeScriptContext?.workspace, chat.includeWorkspaceContext, contextMode]);

	// ── Panel resize ───────────────────────────────────────────────────────────
	useEffect(() => {
		panelWidthRef.current = panelWidth;
	}, [panelWidth]);

	useEffect(() => {
		const mediaQuery = window.matchMedia('(min-width: 640px)');
		const updateLayout = () => setIsWideLayout(mediaQuery.matches);
		updateLayout();
		mediaQuery.addEventListener('change', updateLayout);
		return () => {
			mediaQuery.removeEventListener('change', updateLayout);
		};
	}, []);

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			if (!isResizingRef.current) {
				return;
			}

			const nextWidth = Math.min(
				MAX_PANEL_WIDTH,
				Math.max(MIN_PANEL_WIDTH, window.innerWidth - event.clientX),
			);
			setPanelWidth(nextWidth);
		};

		const handleMouseUp = () => {
			if (!isResizingRef.current) {
				return;
			}

			isResizingRef.current = false;
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(panelWidthRef.current));
		};

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
		};
	}, []);

	// ── Tab management ─────────────────────────────────────────────────────────
	const openNewTab = useCallback(() => {
		const tab = createChatTab('New Chat', true);
		setOpenTabs((tabs) => [...tabs, tab]);
		setActiveTabId(tab.id);
		void chat.startNewThread();
	}, [chat]);

	const closeTab = useCallback(
		(tabId: string) => {
			setOpenTabs((tabs) => {
				if (tabs.length === 1) {
					const tab = createChatTab('New Chat', true);
					setActiveTabId(tab.id);
					void chat.startNewThread();
					return [tab];
				}

				const next = tabs.filter((t) => t.id !== tabId);

				if (tabId === activeTabId) {
					const closedIdx = tabs.findIndex((t) => t.id === tabId);
					const nextActive = next[Math.min(closedIdx, next.length - 1)];

					if (nextActive) {
						setActiveTabId(nextActive.id);

						if (nextActive.threadId) {
							void chat.selectThread(nextActive.threadId);
						} else {
							void chat.startNewThread();
						}
					}
				}

				return next;
			});
		},
		[activeTabId, chat],
	);

	const activateChatTab = useCallback(
		(tab: ChatTab) => {
			setActiveTabId(tab.id);

			if (tab.threadId) {
				void chat.selectThread(tab.threadId);
				return;
			}

			if (tab.isNew) {
				void chat.startNewThread();
			}
		},
		[chat],
	);

	// ── Early return ───────────────────────────────────────────────────────────
	if (!open) {
		return null;
	}

	// ── Layout class ───────────────────────────────────────────────────────────
	const isInline = variant === 'editor' && isWideLayout;

	const panelClass = isInline
		? `relative z-20 flex shrink-0 flex-col overflow-hidden border-l ${editorTheme.aiPanel}`
		: `fixed inset-x-0 top-28 bottom-0 z-50 flex w-full flex-col overflow-hidden border-t shadow-[0_-20px_60px_rgba(0,0,0,0.35)] sm:inset-x-auto sm:right-0 sm:border-l sm:border-t-0 sm:shadow-[-20px_0_60px_rgba(0,0,0,0.35)] ${editorTheme.aiPanel}`;

	const iconBtnClass = editorTheme.aiIconBtn;

	const firstLibraryTitle = libraryDocuments[0]?.title;

	return (
		<aside
			aria-label="AI chat"
			className={panelClass}
			style={{ width: isWideLayout ? panelWidth : '100%' }}
		>
			{/* Resize handle */}
			<div
				aria-hidden
				className="absolute bottom-0 left-0 top-0 z-10 hidden w-1 cursor-col-resize hover:bg-amber-500/30 sm:block"
				onMouseDown={() => {
					isResizingRef.current = true;
					document.body.style.cursor = 'col-resize';
					document.body.style.userSelect = 'none';
				}}
			/>

			{/* Thread history drawer */}
			<AiChatThreadSidebar
				open={threadSidebarOpen}
				documentId={threadDocumentId}
				activeThreadId={activeThreadId}
				isDark={isDark}
				refreshKey={threadRefreshKey}
				onClose={() => setThreadSidebarOpen(false)}
				onNewThread={() => {
					openNewTab();
					setThreadSidebarOpen(false);
				}}
				onSelectThread={(threadId) => {
					const existingTab = openTabs.find((tab) => tab.threadId === threadId);

					if (existingTab) {
						activateChatTab(existingTab);
					} else {
						setOpenTabs((tabs) =>
							tabs.map((t) => (t.id === activeTabId ? { ...t, threadId, isNew: false } : t)),
						);
						void chat.selectThread(threadId);
					}

					setThreadSidebarOpen(false);
				}}
				onThreadDeleted={(threadId) => {
					setThreadRefreshKey((k) => k + 1);
					const tab = openTabs.find((t) => t.threadId === threadId);

					if (tab) {
						setOpenTabs((tabs) =>
							tabs.map((t) =>
								t.threadId === threadId ? { ...t, threadId: null, isNew: true, title: 'New Chat' } : t,
							),
						);
						void chat.startNewThread();
					}
				}}
				onThreadRenamed={() => setThreadRefreshKey((k) => k + 1)}
			/>

			{/* ── Chat tabs ──────────────────────────────────────────────────────── */}
			<div className={`relative z-10 flex h-10 shrink-0 items-stretch border-b ${editorTheme.aiTabBar}`}>
				{/* Scrollable chats */}
				<div className="flex min-w-0 flex-1 items-stretch overflow-x-auto scrollbar-none">
					{openTabs.map((tab) => {
						const isActive = tab.id === activeTabId;

						return (
							<div
								key={tab.id}
								className={`group relative flex min-w-0 max-w-[10rem] shrink-0 items-center border-r border-border ${
									isActive ? editorTheme.aiTabActive : editorTheme.aiTabIdle
								}`}
							>
								<button
									className="flex min-w-0 flex-1 items-center gap-1.5 px-3 py-2 text-left text-xs"
									type="button"
									onClick={() => activateChatTab(tab)}
								>
									<span className="truncate">{tab.title}</span>
								</button>
								<button
									aria-label="Close chat"
									className={`mr-1 shrink-0 rounded p-0.5 opacity-0 transition group-hover:opacity-100 ${
										isActive ? 'opacity-100' : ''
									} hover:bg-accent hover:text-foreground`}
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										closeTab(tab.id);
									}}
								>
									<X size={10} />
								</button>
							</div>
						);
					})}
				</div>

				{/* Action buttons */}
				<div className="flex shrink-0 items-center gap-0.5 border-l border-border px-1.5">
					<button
						aria-label="New chat"
						className={iconBtnClass}
						title="New chat"
						type="button"
						onClick={openNewTab}
					>
						<Plus size={14} />
					</button>

					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label="More options"
							className={iconBtnClass}
							type="button"
						>
							<MoreHorizontal size={14} />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="z-[100] w-44">
							<DropdownMenuItem
								className="gap-2 text-xs"
								onClick={() => setThreadSidebarOpen(true)}
							>
								<MessageSquare size={12} />
								All chats
							</DropdownMenuItem>
							<DropdownMenuItem
								className="gap-2 text-xs"
								onClick={() => setMemoryDrawerOpen(true)}
							>
								<Brain size={12} />
								Memory
							</DropdownMenuItem>
							{onOpenSettings ? (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-xs"
										onClick={() => {
											setMemoryDrawerOpen(false);
											onOpenSettings();
										}}
									>
										AI Settings
									</DropdownMenuItem>
								</>
							) : null}
						</DropdownMenuContent>
					</DropdownMenu>

					<button
						aria-label="Close chat panel"
						className={iconBtnClass}
						title="Close panel (⌘L)"
						type="button"
						onClick={onClose}
					>
						<PanelRightClose size={14} />
					</button>
				</div>
			</div>

			{/* Long conversation warning */}
			{chat.conversationLong && !longConversationBannerDismissed ? (
				<div className={`flex items-start justify-between gap-3 border-b px-3 py-2 text-xs ${editorTheme.warningBanner}`}>
					<p>Conversation is long — start a new chat for best results.</p>
					<div className="flex shrink-0 items-center gap-2">
						<button
							className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${editorTheme.accentPill}`}
							type="button"
							onClick={() => {
								openNewTab();
								setLongConversationBannerDismissed(true);
							}}
						>
							New Chat
						</button>
						<button
							aria-label="Dismiss warning"
							className={`rounded border p-1 ${editorTheme.statusPill}`}
							type="button"
							onClick={() => setLongConversationBannerDismissed(true)}
						>
							<X size={12} />
						</button>
					</div>
				</div>
			) : null}

			{/* Messages */}
			<div className="relative z-0 min-h-0 flex-1 overflow-y-auto">
				<AiChatMessages
					messages={chat.messages}
					status={chat.status}
					isDark={isDark}
					variant={variant}
					isLongConversation={chat.isLongConversation}
					selectedModel={chat.selectedModel}
					availableModels={chat.availableModels}
					firstLibraryTitle={firstLibraryTitle}
					onRegenerate={() => {
						void chat.regenerate();
					}}
					onRegenerateWithModel={(modelId) => {
						void chat.regenerateWithModel(modelId);
					}}
					onEditMessage={chat.editMessage}
					onStarterClick={(prompt) => {
						void chat.submitMessage(prompt);
					}}
					selectionActive={selectionActive}
					onInsertText={
						(interactionMode === 'planner' || interactionMode === 'editor') && variant === 'editor' && editorCommands
							? (text) => {
									void (async () => {
										await snapshotBeforeEditorInsert();
										editorCommands.insertAtCursor(text);
									})();
								}
							: undefined
					}
					onReplaceSelection={
						(interactionMode === 'planner' || interactionMode === 'editor') && variant === 'editor' && editorCommands
							? (text) => {
									void (async () => {
										await snapshotBeforeEditorInsert();
										editorCommands.replaceSelection(text);
									})();
								}
							: undefined
					}
					autoInsertedMessageId={autoInsertedMessageId}
					onUndoAutoInsert={handleUndoAutoInsert}
					memorySuggestions={chat.memorySuggestions}
					onApproveMemory={chat.approveMemorySuggestion}
					onDismissMemory={chat.dismissMemorySuggestion}
				/>
			</div>

			{chat.error ? (
				<div className={`border-t px-4 py-2 text-xs text-red-500 ${editorTheme.border}`}>
					{chat.error}
				</div>
			) : null}

			{pendingToolReview && pendingToolReview.length > 0 ? (
				<div className={`border-t px-3 py-3 text-xs ${editorTheme.border}`}>
					<p className={`mb-2 font-medium ${editorTheme.statusText}`}>Review AI changes</p>
					<div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
						{pendingToolReview.map((preview, index) => (
							<pre
								key={`${preview.toolName}-${index}`}
								className={`whitespace-pre-wrap rounded-lg border p-2 font-mono text-[11px] leading-relaxed ${editorTheme.statusPill}`}
							>
								{preview.summary}
							</pre>
						))}
					</div>
					<div className="flex gap-2">
						<button
							className={`rounded-md border px-3 py-1.5 text-[11px] font-medium ${editorTheme.accentPill}`}
							type="button"
							onClick={() => {
								void acceptPendingTools();
							}}
						>
							Accept
						</button>
						<button
							className={`rounded-md border px-3 py-1.5 text-[11px] ${editorTheme.statusPill}`}
							type="button"
							onClick={rejectPendingTools}
						>
							Reject
						</button>
					</div>
				</div>
			) : null}

			{/* Input */}
			<div className="relative z-0 shrink-0">
				<AiChatInput
					isDark={isDark}
					contextMode={contextMode}
					interactionMode={interactionMode}
					selectedModel={chat.selectedModel}
					allModels={chat.allModels}
					availableModels={chat.availableModels}
					modelConfigurationError={chat.modelConfigurationError}
					isModelConfigured={chat.isModelConfigured}
					status={chat.status}
					canSend={chat.canSend}
					hasProviderConfigured={chat.hasProviderConfigured}
					canUseEditorAi={entitlements.canUseEditorAi()}
					usingCredits={chat.usingCredits}
					creditsRemaining={chat.creditsRemaining}
					includeScriptContext={chat.effectiveIncludeScriptContext}
					includeWorkspaceContext={chat.includeWorkspaceContext}
					selectionActive={selectionActive}
					memoriesCount={chat.memories.length}
					globalRulesActive={chat.settings.globalRules.trim().length > 0}
					scriptCharCount={scriptCharCount}
					workspaceSummaryCharCount={workspaceSummaryCharCount}
					onInteractionModeChange={(mode) => {
						setInteractionMode(mode);
						saveInteractionMode(mode);
					}}
					onToggleScript={() => chat.setIncludeScriptContext(!chat.includeScriptContext)}
					onToggleWorkspace={() => chat.setIncludeWorkspaceContext(!chat.includeWorkspaceContext)}
					onClearSelection={() => setOverrideSelectionText('')}
					onModelChange={chat.setSelectedModel}
					onSubmit={chat.submitMessage}
					onStop={chat.stop}
				/>
			</div>

			{/* Memory drawer */}
			<AiMemoryDrawer
				open={memoryDrawerOpen}
				isDark={isDark}
				documentId={threadDocumentId}
				projectId={activeScriptContext?.projectId}
				memories={chat.memories}
				onClose={() => setMemoryDrawerOpen(false)}
				onMemoriesChange={() => {
					void chat.reloadMemories();
				}}
			/>
		</aside>
	);
}
