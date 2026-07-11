import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { Brain, Cpu, MoreHorizontal, PanelRightClose, Plus, Settings, X } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ScreenplayDocumentRecord, ScreenplayProjectRecord, ScreenplayWorkspaceData } from '../../types';
import { createDefaultWorkspaceData } from '../../types';
import { useAiChat, type AiChatContextMode } from '../../hooks/useAiChat';
import { deleteChatThread, getChatThread } from '../../utils/ai-memory-storage';
import type { AiChatThread } from '../../utils/ai-memory-storage';
import type { CollaboratorPresence } from '@dastan/plugin-api';
import {
	saveInteractionMode,
	interactionModeEnablesTools,
	type AiInteractionMode,
} from '../../utils/ai-interaction-mode';
import {
	loadDocumentAiPrefs,
	resolveDocumentInteractionMode,
	saveDocumentAiPrefs,
	clearDocumentSelectedModel,
} from '../../utils/ai-document-prefs';
import { AUTO_MODEL_ID } from '../../utils/ai-models';
import { cycleInteractionMode } from '../../utils/ai-mode-config';
import type { AiSettingsSection } from '../../utils/ai-settings-sections';
import { formatWorkspaceSummary } from '../../utils/ai-context';
import { toPlainTextScreenplay } from '../../utils/screenplay-text';
import { looksLikeScreenplayText } from '../../utils/insert-screenplay-text';
import { GENERAL_CHAT_DOCUMENT_ID } from '../../utils/user-settings';
import { AiChatInput } from './AiChatInput';
import { AiChatMessages } from './AiChatMessages';
import { AiChatHistoryMenu } from './AiChatHistoryMenu';
import { AiMemoryDrawer } from './AiMemoryDrawer';
import { useDastanApp } from '../../context/DastanAppProvider';
import { executeAiTool } from '../../utils/ai-tool-executor';
import {
	formatToolPreview,
	mapToolPartStateToPreviewStatus,
	markRunningToolsSkipped,
	mergeLiveToolPreviews,
	type ToolPreviewState,
} from '../../utils/ai-tool-preview';
import { useEditorCommands } from '../../context/EditorCommandContext';
import { useScreenplayStore } from '../../store';
import { getEditorTheme } from '../../utils/editor-theme';
import { AiRulesDrawer } from './AiRulesDrawer';
import { AiToolCallCard } from './AiToolCallCard';
import { extractToolParts } from '../../utils/ai-tool-executor';

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
	onOpenSettings?: (section?: AiSettingsSection) => void;
	selectionText?: string;
	activeBlockIndex?: number | null;
	scriptContext?: {
		documentId: string;
		projectId?: string;
		documentTitle: string;
		documentContent: JSONContent | null;
		workspace: ScreenplayWorkspaceData;
	};
	libraryDocuments?: ScreenplayDocumentRecord[];
	libraryProjects?: ScreenplayProjectRecord[];
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
	activeBlockIndex = null,
	scriptContext,
	libraryDocuments = [],
	libraryProjects = [],
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
	const setDocumentWorkspace = useScreenplayStore((state) => state.setDocumentWorkspace);
	const chatInputRef = useRef<HTMLTextAreaElement>(null);

	// ── Tab state ──────────────────────────────────────────────────────────────
	const [openTabs, setOpenTabs] = useState<ChatTab[]>(() => [createChatTab('New Chat', true)]);
	const [activeTabId, setActiveTabId] = useState(() => openTabs[0]?.id ?? 'initial');

	const activeTab = openTabs.find((t) => t.id === activeTabId) ?? openTabs[0];
	const activeThreadId = activeTab?.threadId ?? null;
	const activeChatSessionId = activeTab?.sessionId ?? 'pending';

	// ── Other state ────────────────────────────────────────────────────────────
	const [threadRefreshKey, setThreadRefreshKey] = useState(0);
	const [memoryDrawerOpen, setMemoryDrawerOpen] = useState(false);
	const [rulesDrawerOpen, setRulesDrawerOpen] = useState(false);
	const contextMode: AiChatContextMode =
		variant === 'editor' || Boolean(selectedScriptId) ? 'script' : 'general';
	const prefsDocumentId =
		contextMode === 'general'
			? GENERAL_CHAT_DOCUMENT_ID
			: (scriptContext?.documentId ?? selectedScriptId ?? GENERAL_CHAT_DOCUMENT_ID);
	const [interactionMode, setInteractionMode] = useState<AiInteractionMode>(() =>
		resolveDocumentInteractionMode(
			variant === 'editor' ? prefsDocumentId : null,
			variant === 'editor' ? 'planner' : 'ask',
		),
	);
	const [overrideSelectionText, setOverrideSelectionText] = useState<string | null>(null);
	const [longConversationBannerDismissed, setLongConversationBannerDismissed] = useState(false);
	const [autoInsertedMessageId, setAutoInsertedMessageId] = useState<string | null>(null);
	const [pendingToolReview, setPendingToolReview] = useState<ToolPreviewState[] | null>(null);
	const [messageToolPreviews, setMessageToolPreviews] = useState<Record<string, ToolPreviewState[]>>({});

	const acceptSingleTool = useCallback(
		async (toolId: string) => {
			if (!editorCommands) {
				return;
			}

			const preview = pendingToolReview?.find((item) => item.id === toolId);

			if (!preview || preview.status !== 'preview') {
				return;
			}

			if (currentDocument) {
				await storage.versions.saveSnapshot(currentDocument);
			}

			executeAiTool(preview.toolName, preview.input, editorCommands);
			setPendingToolReview((current) =>
				current?.map((item) => (item.id === toolId ? { ...item, status: 'accepted' as const } : item)) ?? null,
			);
			setMessageToolPreviews((current) => {
				const next = { ...current };

				for (const [messageId, previews] of Object.entries(next)) {
					next[messageId] = previews.map((item) =>
						item.id === toolId ? { ...item, status: 'accepted' as const } : item,
					);
				}

				return next;
			});
		},
		[currentDocument, editorCommands, pendingToolReview, storage],
	);

	const rejectSingleTool = useCallback((toolId: string) => {
		setPendingToolReview((current) => {
			const next = current?.map((item) => (item.id === toolId ? { ...item, status: 'rejected' as const } : item)) ?? null;
			return next?.every((item) => item.status !== 'preview') ? null : next;
		});
		setMessageToolPreviews((current) => {
			const next = { ...current };

			for (const [messageId, previews] of Object.entries(next)) {
				next[messageId] = previews.map((item) =>
					item.id === toolId ? { ...item, status: 'rejected' as const } : item,
				);
			}

			return next;
		});
	}, []);

	const acceptPendingTools = useCallback(async () => {
		if (!pendingToolReview?.length || !editorCommands) {
			return;
		}

		const pending = pendingToolReview.filter((item) => item.status === 'preview');

		for (const preview of pending) {
			if (currentDocument) {
				await storage.versions.saveSnapshot(currentDocument);
			}

			try {
				executeAiTool(preview.toolName, preview.input, editorCommands);
			} catch {
				setPendingToolReview((current) =>
					current?.map((item) =>
						item.id === preview.id ? { ...item, status: 'failed' as const } : item,
					) ?? null,
				);
				return;
			}
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
		libraryProjects,
		threadId: activeThreadId,
		roomId: collaborationRoomId,
		activeCollaborators,
		panelOpen: open,
		selectionText: effectiveSelectionText ?? null,
		activeBlockIndex,
		activeWorkspaceTab,
		onToolInvocations: (invocations, messageId) => {
			if (invocations.length === 0) {
				return;
			}

			const previews = invocations.map((invocation) => ({
				...formatToolPreview(invocation.toolName, invocation.input),
				id: invocation.toolCallId,
				status: 'preview' as const,
			}));

			setMessageToolPreviews((current) => {
				const merged = mergeLiveToolPreviews(current[messageId], previews);
				return { ...current, [messageId]: merged };
			});
			setPendingToolReview((current) => {
				const merged = mergeLiveToolPreviews(current ?? undefined, previews);
				return merged.filter((item) => item.status === 'preview' || item.status === 'failed');
			});
		},
		onThreadChange: handleThreadChange,
		onThreadCreated: handleThreadCreated,
	});

	useEffect(() => {
		if (open) {
			chat.refreshSettings();
		}
	}, [chat.refreshSettings, open]);

	// Live tool cards + activity while args stream (editor mode only).
	useEffect(() => {
		if (variant !== 'editor' || !interactionModeEnablesTools(interactionMode)) {
			return;
		}

		const lastMessage = chat.messages.at(-1);

		if (!lastMessage || lastMessage.role !== 'assistant') {
			return;
		}

		const parts = extractToolParts(lastMessage);

		if (parts.length === 0) {
			return;
		}

		const streamActive = chat.status === 'streaming' || chat.status === 'submitted';
		const incoming = parts.map((part) => ({
			...formatToolPreview(part.toolName, part.input),
			id: part.toolCallId,
			status: mapToolPartStateToPreviewStatus(part.state, { streamActive }),
		}));

		setMessageToolPreviews((current) => {
			const merged = mergeLiveToolPreviews(current[lastMessage.id], incoming);
			return { ...current, [lastMessage.id]: merged };
		});

		if (!streamActive) {
			setPendingToolReview((current) => {
				const preserved = (current ?? []).filter((item) =>
					['accepted', 'rejected', 'skipped'].includes(item.status),
				);
				const ready = incoming.filter((item) => item.status === 'preview' || item.status === 'failed');
				const byId = new Map([...preserved, ...ready].map((item) => [item.id, item]));
				return [...byId.values()];
			});
		} else {
			setPendingToolReview((current) => {
				const existingById = new Map((current ?? []).map((item) => [item.id, item]));
				for (const item of incoming) {
					const previous = existingById.get(item.id);
					if (previous && ['accepted', 'rejected', 'failed', 'skipped'].includes(previous.status)) {
						continue;
					}
					if (item.status === 'preview') {
						existingById.set(item.id, item);
					}
				}
				const next = [...existingById.values()].filter(
					(item) => item.status === 'preview' || item.status === 'failed',
				);
				return next.length > 0 ? next : current;
			});
		}
	}, [chat.messages, chat.status, interactionMode, variant]);

	const handleStopChat = useCallback(() => {
		chat.stop();

		const lastMessage = chat.messages.at(-1);

		if (!lastMessage || lastMessage.role !== 'assistant') {
			return;
		}

		setMessageToolPreviews((current) => {
			const existing = current[lastMessage.id];

			if (!existing?.length) {
				return current;
			}

			return { ...current, [lastMessage.id]: markRunningToolsSkipped(existing) };
		});
		setPendingToolReview((current) => {
			if (!current?.length) {
				return current;
			}

			const next = markRunningToolsSkipped(current).filter(
				(item) => item.status === 'preview' || item.status === 'failed',
			);
			return next.length > 0 ? next : null;
		});
	}, [chat]);

	// ── Offer accept/reject for long-form planner script output ───────────────
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

		const preview: ToolPreviewState = {
			id: `planner-insert-${lastMessage.id}`,
			toolName: 'planner_insert',
			input: { text },
			summary: text.slice(0, 2000),
			mutatesScript: true,
			status: 'preview',
		};

		setPendingToolReview([preview]);
		setMessageToolPreviews((current) => ({
			...current,
			[lastMessage.id]: [preview],
		}));
	}, [chat.messages, chat.status, editorCommands, interactionMode, variant]);

	const handleInsertScreenplayChunk = useCallback(
		(text: string) => {
			if (variant !== 'editor' || !editorCommands) {
				return;
			}

			const lastMessage = chat.messages.at(-1);
			const messageId = lastMessage?.role === 'assistant' ? lastMessage.id : `screenplay-${Date.now()}`;
			const preview: ToolPreviewState = {
				id: `planner-insert-chunk-${Date.now()}`,
				toolName: 'planner_insert',
				input: { text },
				summary: text.slice(0, 2000),
				mutatesScript: true,
				status: 'preview',
			};

			setPendingToolReview([preview]);
			setMessageToolPreviews((current) => ({
				...current,
				[messageId]: [...(current[messageId] ?? []).filter((item) => item.id !== preview.id), preview],
			}));
		},
		[chat.messages, editorCommands, variant],
	);

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
			const mod = event.metaKey || event.ctrlKey;

			if (mod && event.key === '.') {
				event.preventDefault();
				const canEditor = entitlements.canUseEditorAi() || chat.hasProviderConfigured;
				setInteractionMode((current) => {
					const next = cycleInteractionMode(current, canEditor);
					saveInteractionMode(next);
					if (variant === 'editor') {
						saveDocumentAiPrefs(prefsDocumentId, { interactionMode: next });
					}
					return next;
				});
				return;
			}

			if (mod && event.key.toLowerCase() === 'l' && variant === 'editor') {
				event.preventDefault();
				chatInputRef.current?.focus();
				return;
			}

			if (event.key === 'Escape') {
				if (chat.status === 'streaming' || chat.status === 'submitted') {
					handleStopChat();
					return;
				}

				if (rulesDrawerOpen) {
					setRulesDrawerOpen(false);
					return;
				}

				if (memoryDrawerOpen) {
					setMemoryDrawerOpen(false);
					return;
				}

				onClose();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [
		chat.hasProviderConfigured,
		chat.status,
		entitlements,
		handleStopChat,
		memoryDrawerOpen,
		onClose,
		open,
		prefsDocumentId,
		rulesDrawerOpen,
		variant,
	]);

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

		const endResize = () => {
			if (!isResizingRef.current) {
				return;
			}

			isResizingRef.current = false;
			document.body.style.cursor = '';
			document.body.style.removeProperty('user-select');
			document.documentElement.classList.remove('ai-chat-resizing');
			window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(panelWidthRef.current));
		};

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', endResize);
		window.addEventListener('blur', endResize);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', endResize);
			window.removeEventListener('blur', endResize);
			document.body.style.removeProperty('user-select');
			document.documentElement.classList.remove('ai-chat-resizing');
		};
	}, []);

	// ── Tab management ─────────────────────────────────────────────────────────
	const discardEmptyThread = useCallback(async (threadId: string | null) => {
		if (!threadId) {
			return;
		}

		const thread = await getChatThread(threadId);

		if (thread && thread.messages.length === 0) {
			await deleteChatThread(threadId);
			setThreadRefreshKey((k) => k + 1);
		}
	}, []);

	const openNewTab = useCallback(() => {
		const tab = createChatTab('New Chat', true);
		setOpenTabs((tabs) => [...tabs, tab]);
		setActiveTabId(tab.id);
	}, []);

	const closeTab = useCallback(
		(tabId: string) => {
			const closingTab = openTabs.find((t) => t.id === tabId);

			if (closingTab?.threadId) {
				void discardEmptyThread(closingTab.threadId);
			}

			if (openTabs.length === 1) {
				const tab = createChatTab('New Chat', true);
				setOpenTabs([tab]);
				setActiveTabId(tab.id);
				onClose();
				return;
			}

			const next = openTabs.filter((t) => t.id !== tabId);

			if (tabId === activeTabId) {
				const closedIdx = openTabs.findIndex((t) => t.id === tabId);
				const nextActive = next[Math.min(closedIdx, next.length - 1)];

				if (nextActive) {
					setActiveTabId(nextActive.id);
				}
			}

			setOpenTabs(next);
		},
		[activeTabId, discardEmptyThread, onClose, openTabs],
	);

	const activateChatTab = useCallback((tab: ChatTab) => {
		setActiveTabId(tab.id);
	}, []);

	const tabStripRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const strip = tabStripRef.current;

		if (!strip) {
			return;
		}

		const activeEl = strip.querySelector<HTMLElement>('[data-active-chat-tab="true"]');
		activeEl?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
	}, [activeTabId, openTabs.length]);

	useEffect(() => {
		const strip = tabStripRef.current;

		if (!strip) {
			return;
		}

		const onWheel = (event: WheelEvent) => {
			if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
				return;
			}

			event.preventDefault();
			strip.scrollLeft += event.deltaY;
		};

		strip.addEventListener('wheel', onWheel, { passive: false });
		return () => strip.removeEventListener('wheel', onWheel);
	}, [open]);

	const openThreadInNewTab = useCallback((threadId: string, title: string) => {
		const existingTab = openTabs.find((tab) => tab.threadId === threadId);

		if (existingTab) {
			setActiveTabId(existingTab.id);
			return;
		}

		const tab: ChatTab = {
			id: makeTabId(),
			sessionId: globalThis.crypto.randomUUID(),
			threadId,
			isNew: false,
			title,
		};

		setOpenTabs((tabs) => [...tabs, tab]);
		setActiveTabId(tab.id);
	}, [openTabs]);

	const handleThreadDeleted = useCallback((threadId: string) => {
		setThreadRefreshKey((k) => k + 1);

		setOpenTabs((tabs) => {
			const remaining = tabs.filter((tab) => tab.threadId !== threadId);

			if (remaining.length > 0) {
				return remaining;
			}

			// Never leave the panel with zero tabs — that unmounts it while chatOpen
			// can stay true, so reopening appears broken until refresh.
			return [createChatTab('New Chat', true)];
		});
	}, []);

	useEffect(() => {
		if (openTabs.length === 0) {
			return;
		}

		if (!openTabs.some((tab) => tab.id === activeTabId)) {
			setActiveTabId(openTabs[0]!.id);
		}
	}, [activeTabId, openTabs]);

	useEffect(() => {
		if (!open || openTabs.length > 0) {
			return;
		}

		const tab = createChatTab('New Chat', true);
		setOpenTabs([tab]);
		setActiveTabId(tab.id);
	}, [open, openTabs.length]);

	// ── Early return ───────────────────────────────────────────────────────────
	if (!open || !activeTab) {
		return null;
	}

	// ── Layout class ───────────────────────────────────────────────────────────
	const isInline = isWideLayout;

	const panelClass = isInline
		? `relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-l ${editorTheme.aiPanel}`
		: `fixed inset-0 z-50 flex flex-col overflow-hidden ${editorTheme.aiPanel}`;

	const iconBtnClass = editorTheme.aiIconBtn;

	const firstLibraryTitle = libraryDocuments[0]?.title;

	return (
		<aside
			aria-label="AI chat"
			className={panelClass}
			style={isInline ? { width: panelWidth } : undefined}
		>
			{/* Resize handle */}
			<div
				aria-hidden
				className="absolute bottom-0 left-0 top-0 z-10 hidden w-1 cursor-col-resize hover:bg-amber-500/30 sm:block"
				onMouseDown={(event) => {
					event.preventDefault();
					isResizingRef.current = true;
					document.body.style.cursor = 'col-resize';
					document.documentElement.classList.add('ai-chat-resizing');
				}}
			/>

			{/* ── Chat tabs ──────────────────────────────────────────────────────── */}
			<div className={`relative z-10 flex h-10 shrink-0 items-stretch overflow-hidden border-b ${editorTheme.aiTabBar}`}>
				{/* Equal-width tabs; horizontal scroll only, no visible scrollbar */}
				<div
					ref={tabStripRef}
					className="scrollbar-none flex h-full min-w-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden"
				>
					{openTabs.map((tab) => {
						const isActive = tab.id === activeTabId;

						return (
							<div
								key={tab.id}
								data-active-chat-tab={isActive ? 'true' : undefined}
								className={`group relative flex h-full w-36 shrink-0 items-center border-r border-border ${
									isActive ? editorTheme.aiTabActive : editorTheme.aiTabIdle
								}`}
								title={tab.title}
							>
								<button
									className="flex h-full min-w-0 flex-1 items-center gap-1.5 px-2 text-left text-xs"
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

					<AiChatHistoryMenu
						activeThreadId={activeThreadId}
						documentId={threadDocumentId}
						isDark={isDark}
						libraryDocumentId={variant === 'editor' ? GENERAL_CHAT_DOCUMENT_ID : undefined}
						refreshKey={threadRefreshKey}
						scriptScopeLabel={activeScriptContext?.documentTitle ?? 'This script'}
						triggerClassName={iconBtnClass}
						onSelectThread={openThreadInNewTab}
						onThreadDeleted={handleThreadDeleted}
						onThreadRenamed={() => setThreadRefreshKey((k) => k + 1)}
					/>
					{onOpenSettings ? (
						<button
							aria-label="AI settings"
							className={iconBtnClass}
							title="AI settings"
							type="button"
							onClick={() => onOpenSettings()}
						>
							<Settings size={14} />
						</button>
					) : null}

					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label="More options"
							className={iconBtnClass}
							type="button"
						>
							<MoreHorizontal size={14} />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="z-[100] w-52">
							{variant === 'editor' && prefsDocumentId !== GENERAL_CHAT_DOCUMENT_ID ? (
								<>
									<DropdownMenuItem
										className="gap-2 text-xs"
										onClick={() => onOpenSettings?.('models')}
									>
										<Cpu size={12} />
										<span className="min-w-0 truncate">
											Model:{' '}
											{chat.selectedModel === AUTO_MODEL_ID
												? 'Auto'
												: (chat.allModels.find((model) => model.id === chat.selectedModel)?.label ??
													chat.selectedModel)}
										</span>
									</DropdownMenuItem>
									{loadDocumentAiPrefs(prefsDocumentId).selectedModel ? (
										<DropdownMenuItem
											className="text-xs"
											onClick={() => {
												clearDocumentSelectedModel(prefsDocumentId);
												chat.setSelectedModel(AUTO_MODEL_ID);
											}}
										>
											Reset model to default
										</DropdownMenuItem>
									) : null}
									<DropdownMenuSeparator />
								</>
							) : null}
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
			<div className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain">
				<AiChatMessages
					messages={chat.messages}
					status={chat.status}
					isDark={isDark}
					variant={variant}
					isLongConversation={chat.isLongConversation}
					firstLibraryTitle={firstLibraryTitle}
					onRegenerate={() => {
						void chat.regenerate();
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
					onInsertScreenplayChunk={
						variant === 'editor' && editorCommands ? handleInsertScreenplayChunk : undefined
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
					messageToolPreviews={messageToolPreviews}
					onAcceptTool={(toolId) => void acceptSingleTool(toolId)}
					onRejectTool={rejectSingleTool}
				/>
			</div>

			{chat.error ? (
				<div className={`border-t px-4 py-2 text-xs text-red-500 ${editorTheme.border}`}>
					{chat.error}
				</div>
			) : null}

			{pendingToolReview && pendingToolReview.filter((item) => item.status === 'preview').length > 0 ? (
				<div
					className={`sticky bottom-0 z-10 border-t px-3 py-2 text-xs backdrop-blur-sm ${editorTheme.border} ${editorTheme.aiInputShell}`}
				>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className={editorTheme.statusText}>
							{pendingToolReview.filter((item) => item.status === 'preview').length} changes pending
						</p>
						<div className="flex gap-2">
							<button
								className={`text-[10px] uppercase tracking-[0.12em] underline-offset-2 hover:underline ${editorTheme.statusText}`}
								type="button"
								onClick={() => setPendingToolReview(null)}
							>
								Review
							</button>
							<button
								className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${editorTheme.accentPill}`}
								type="button"
								onClick={() => void acceptPendingTools()}
							>
								Accept all
							</button>
							<button
								className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${editorTheme.statusPill}`}
								type="button"
								onClick={rejectPendingTools}
							>
								Reject all
							</button>
						</div>
					</div>
					<div className="mt-2 max-h-36 space-y-2 overflow-y-auto">
						{pendingToolReview.map((preview) => (
							<AiToolCallCard
								key={preview.id}
								isDark={isDark}
								preview={preview}
								onAccept={() => void acceptSingleTool(preview.id)}
								onReject={() => rejectSingleTool(preview.id)}
							/>
						))}
					</div>
				</div>
			) : null}

			{/* Input */}
			<div className="relative z-0 shrink-0">
				<AiChatInput
					inputRef={chatInputRef}
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
					canUseEditorAi={entitlements.canUseEditorAi() || chat.hasProviderConfigured}
					usingCredits={chat.usingCredits}
					creditsRemaining={chat.creditsRemaining}
					includeScriptContext={chat.effectiveIncludeScriptContext}
					includeWorkspaceContext={chat.includeWorkspaceContext}
					scriptContextSections={chat.scriptContextSections}
					selectionActive={selectionActive}
					selectionText={effectiveSelectionText}
					activeBlockIndex={activeBlockIndex}
					documentContent={activeScriptContext?.documentContent ?? null}
					workspace={activeScriptContext?.workspace ?? createDefaultWorkspaceData()}
					globalRules={chat.settings.globalRules}
					documentRules={chat.documentRules}
					memories={chat.memories}
					codexItems={chat.codexItems}
					memoriesCount={chat.includedMemoriesCount}
					suggestedMemoriesCount={chat.suggestedMemoriesCount}
					globalRulesActive={chat.settings.globalRules.trim().length > 0}
					documentRulesActive={chat.documentRules.length > 0}
					onInteractionModeChange={(mode) => {
						setInteractionMode(mode);
						saveInteractionMode(mode);
						saveDocumentAiPrefs(prefsDocumentId, { interactionMode: mode });
					}}
					onClearSelection={() => setOverrideSelectionText('')}
					onModelChange={chat.setSelectedModel}
					onIncludeScriptChange={chat.setIncludeScriptContext}
					onIncludeWorkspaceChange={chat.setIncludeWorkspaceContext}
					onScriptSectionChange={chat.setScriptContextSections}
					onOpenSettings={onOpenSettings}
					onOpenMemories={() => setMemoryDrawerOpen(true)}
					onOpenRules={() => setRulesDrawerOpen(true)}
					onSubmit={chat.submitMessage}
					onStop={handleStopChat}
				/>
			</div>

			<AiRulesDrawer
				documentRules={activeScriptContext?.workspace.aiWriterRules ?? ''}
				isDark={isDark}
				open={rulesDrawerOpen}
				onClose={() => setRulesDrawerOpen(false)}
				onDocumentRulesChange={(rules) => {
					setDocumentWorkspace({ aiWriterRules: rules });
				}}
			/>

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
