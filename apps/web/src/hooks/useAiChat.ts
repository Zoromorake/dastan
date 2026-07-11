import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { JSONContent } from '@tiptap/core';
import type { ScreenplayDocumentRecord, ScreenplayProjectRecord, ScreenplayWorkspaceData } from '../types';
import { useDastanApp } from '../context/DastanAppProvider';
import type { CollaboratorPresence } from '@dastan/plugin-api';
import { buildGeneralAiContext } from '../utils/ai-context-general';
import { buildAiContext } from '../utils/ai-context';
import { LONG_CONVERSATION_MESSAGE_THRESHOLD, compressConversationHistory } from '../utils/ai-context-summary';
import {
	createAiMemory,
	createChatThread,
	getChatThread,
	listAiMemories,
	saveChatThread,
	type AiChatMessage,
	type AiMemory,
	type AiChatThread,
} from '../utils/ai-memory-storage';
import { listCodexItems, type CodexItem } from '../utils/codex-storage';
import { extractMemorySuggestions } from '../utils/ai-memory-extract';
import { toCollaborationChatMessage } from '../utils/collaboration-chat';
import { useCollaborationChatSync } from './useCollaborationChatSync';
import { isDevEditorAiEnabled } from '../utils/dev-editor-ai';
import {
	AUTO_MODEL_ID,
	AI_MODEL_REGISTRY,
	getAvailableModels,
	getModelConfigurationError,
	hasAnyProviderConfigured,
	isModelConfigured,
	resolveEffectiveModel,
} from '../utils/ai-models';
import { loadAiSettings, saveAiSettings, type AiSettings } from '../utils/ai-settings';
import type { AiInteractionMode } from '../utils/ai-interaction-mode';
import { interactionModeEnablesTools } from '../utils/ai-interaction-mode';
import { extractToolInvocations } from '../utils/ai-tool-executor';
import { GENERAL_CHAT_DOCUMENT_ID } from '../utils/user-settings';
import {
	loadDocumentAiPrefs,
	resolveScriptContextSections,
	saveDocumentAiPrefs,
} from '../utils/ai-document-prefs';
import {
	defaultScriptContextSections,
	type ScriptContextSections,
} from '../utils/ai-script-context-options';
import { buildContextManifest, toStoredContextManifest } from '../utils/context-manifest';
import { selectRelevantApprovedMemories } from '../utils/ai-memory-relevance';
import { getActiveDocuments, getAllProjects } from '../utils/screenplay-storage';

export type AiChatContextMode = 'general' | 'script';

export interface MemorySuggestion {
	id: string;
	text: string;
	suggestedScope: AiMemory['scope'];
}

function getTextFromUiMessage(message: UIMessage): string {
	return message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join('');
}

type UiMessageWithMeta = UIMessage & {
	contextManifest?: AiChatMessage['contextManifest'];
	modelId?: string;
	modelSelection?: string;
};

function uiMessagesToStored(messages: UIMessage[]): AiChatMessage[] {
	return messages
		.filter((message) => message.role === 'user' || message.role === 'assistant')
		.map((message) => {
			const meta = message as UiMessageWithMeta;

			return {
				id: message.id,
				role: message.role,
				content: getTextFromUiMessage(message),
				createdAt: new Date().toISOString(),
				...(meta.modelId ? { modelId: meta.modelId } : {}),
				...(meta.modelSelection ? { modelSelection: meta.modelSelection } : {}),
				...(meta.contextManifest ? { contextManifest: meta.contextManifest } : {}),
			};
		});
}

function storedMessagesToUi(messages: AiChatMessage[]): UIMessage[] {
	return messages.map((message) => ({
		id: message.id,
		role: message.role,
		parts: [{ type: 'text', text: message.content }],
		...(message.modelId ? { modelId: message.modelId } : {}),
		...(message.modelSelection ? { modelSelection: message.modelSelection } : {}),
		...(message.contextManifest ? { contextManifest: message.contextManifest } : {}),
	}));
}

interface SystemPromptSnapshot {
	contextMode: AiChatContextMode;
	interactionMode: AiInteractionMode;
	libraryDocuments: ScreenplayDocumentRecord[];
	libraryProjects: ScreenplayProjectRecord[];
	globalRules: string;
	memories: AiMemory[];
	codexItems: CodexItem[];
	projectId?: string;
	relevanceQuery: string;
	documentId: string;
	documentTitle: string;
	documentContent: JSONContent | null;
	workspace: ScreenplayWorkspaceData;
	documentRules: string;
	includeScriptContext: boolean;
	includeWorkspaceContext: boolean;
	scriptContextSections: ScriptContextSections;
	selectionText: string | null;
	activeBlockIndex: number | null;
	activeWorkspaceTab: string | null;
	activeCollaborators: CollaboratorPresence[];
}

function buildSystemPromptFromSnapshot(snapshot: SystemPromptSnapshot): string {
	if (snapshot.contextMode === 'general') {
		return buildGeneralAiContext({
			documents: snapshot.libraryDocuments,
			projects: snapshot.libraryProjects,
			globalRules: snapshot.globalRules,
			memories: snapshot.memories,
			codexItems: snapshot.codexItems,
			projectId: snapshot.projectId,
			interactionMode: snapshot.interactionMode,
			relevanceQuery: snapshot.relevanceQuery,
		}).systemPrompt;
	}

	return buildAiContext({
		documentId: snapshot.documentId,
		documentTitle: snapshot.documentTitle,
		documentContent: snapshot.documentContent,
		workspace: snapshot.workspace,
		globalRules: snapshot.globalRules,
		documentRules: snapshot.documentRules,
		memories: snapshot.memories,
		codexItems: snapshot.codexItems,
		projectId: snapshot.projectId,
		includeScriptContext: snapshot.includeScriptContext,
		includeWorkspaceContext: snapshot.includeWorkspaceContext,
		scriptContextSections: snapshot.scriptContextSections,
		selectionText: snapshot.selectionText,
		activeBlockIndex: snapshot.activeBlockIndex,
		relevanceQuery: snapshot.relevanceQuery,
		interactionMode: snapshot.interactionMode,
		activeWorkspaceTab: snapshot.activeWorkspaceTab,
		activeCollaborators: snapshot.activeCollaborators,
	}).systemPrompt;
}

async function resolveSystemPromptForRequest(snapshot: SystemPromptSnapshot): Promise<string> {
	if (snapshot.contextMode === 'general') {
		try {
			const [documents, projects] = await Promise.all([getActiveDocuments(), getAllProjects()]);
			return buildSystemPromptFromSnapshot({
				...snapshot,
				libraryDocuments: documents,
				libraryProjects: projects,
			});
		} catch {
			// Fall back to the latest in-memory snapshot if storage is temporarily unavailable.
		}
	}

	return buildSystemPromptFromSnapshot(snapshot);
}

interface UseAiChatOptions {
	contextMode: AiChatContextMode;
	interactionMode: AiInteractionMode;
	chatSessionId: string;
	threadDocumentId: string;
	projectId?: string;
	documentId: string;
	documentTitle: string;
	documentContent: JSONContent | null;
	workspace: ScreenplayWorkspaceData;
	libraryDocuments?: ScreenplayDocumentRecord[];
	libraryProjects?: ScreenplayProjectRecord[];
	threadId: string | null;
	roomId?: string | null;
	activeCollaborators?: CollaboratorPresence[];
	panelOpen?: boolean;
	selectionText?: string | null;
	activeBlockIndex?: number | null;
	activeWorkspaceTab?: string | null;
	onToolInvocations?: (invocations: Array<{ toolName: string; input: unknown }>, messageId: string) => void;
	onThreadChange: (thread: AiChatThread) => void;
	onThreadCreated: (thread: AiChatThread) => void;
}

export function useAiChat({
	contextMode,
	interactionMode,
	chatSessionId,
	threadDocumentId,
	projectId,
	documentId,
	documentTitle,
	documentContent,
	workspace,
	libraryDocuments = [],
	libraryProjects = [],
	threadId,
	roomId = null,
	activeCollaborators = [],
	panelOpen = true,
	selectionText = null,
	activeBlockIndex = null,
	activeWorkspaceTab = null,
	onToolInvocations,
	onThreadChange,
	onThreadCreated,
}: UseAiChatOptions) {
	const { aiProviders, entitlements, collaboration, auth } = useDastanApp();
	const aiProvidersRef = useRef(aiProviders);
	aiProvidersRef.current = aiProviders;
	const settingsRef = useRef(loadAiSettings());
	const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings());
	const [memories, setMemories] = useState<Awaited<ReturnType<typeof listAiMemories>>>([]);
	const [codexItems, setCodexItems] = useState<CodexItem[]>([]);
	const [activeThread, setActiveThread] = useState<AiChatThread | null>(null);
	const [includeScriptContext, setIncludeScriptContextState] = useState(() => {
		const docPrefs = loadDocumentAiPrefs(threadDocumentId);
		return docPrefs.includeScriptContext ?? settings.includeScriptContext;
	});
	const [includeWorkspaceContext, setIncludeWorkspaceContextState] = useState(() => {
		const docPrefs = loadDocumentAiPrefs(threadDocumentId);
		return docPrefs.includeWorkspaceContext ?? settings.includeWorkspaceContext;
	});
	const [scriptContextSections, setScriptContextSectionsState] = useState<ScriptContextSections>(() =>
		resolveScriptContextSections(threadDocumentId),
	);
	const lastContextManifestRef = useRef<ReturnType<typeof toStoredContextManifest> | null>(null);
	const lastResolvedModelRef = useRef<{ modelId: string; modelSelection: string } | null>(null);
	const [selectedModel, setSelectedModel] = useState(AUTO_MODEL_ID);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [memorySuggestions, setMemorySuggestions] = useState<MemorySuggestion[]>([]);
	const [relevanceQuery, setRelevanceQuery] = useState('');
	const activeThreadRef = useRef<AiChatThread | null>(null);
	const messagesRef = useRef<UIMessage[]>([]);
	const statusRef = useRef<'submitted' | 'streaming' | 'ready' | 'error'>('ready');
	const modelOverrideRef = useRef<string | null>(null);
	const dismissedMemoryTextsRef = useRef<Set<string>>(new Set());
	const contextModeRef = useRef(contextMode);
	const memoryDocumentId = contextMode === 'general' ? GENERAL_CHAT_DOCUMENT_ID : threadDocumentId;
	const collaborationRoomId = collaboration.isAvailable() ? (roomId ?? threadDocumentId) : null;
	const activeSelectionText = selectionText?.trim() || null;

	useEffect(() => {
		const docPrefs = loadDocumentAiPrefs(threadDocumentId);
		setIncludeScriptContextState(docPrefs.includeScriptContext ?? settings.includeScriptContext);
		setIncludeWorkspaceContextState(docPrefs.includeWorkspaceContext ?? settings.includeWorkspaceContext);
		setScriptContextSectionsState(resolveScriptContextSections(threadDocumentId));
	}, [threadDocumentId, settings.includeScriptContext, settings.includeWorkspaceContext]);

	const documentRules = workspace.aiWriterRules?.trim() ?? '';
	const suggestedMemoriesCount = useMemo(
		() => memories.filter((memory) => (memory.status ?? 'approved') === 'suggested').length,
		[memories],
	);
	const includedMemoriesCount = useMemo(() => {
		const pinnedCount = memories.filter(
			(memory) => memory.pinned && (memory.status ?? 'approved') !== 'suggested',
		).length;
		const relevantCount = selectRelevantApprovedMemories(memories, {
			documentId: contextMode === 'general' ? undefined : documentId,
			projectId,
			relevanceQuery,
		}).length;

		return pinnedCount + relevantCount;
	}, [contextMode, documentId, memories, projectId, relevanceQuery]);
	const selectionActive = Boolean(activeSelectionText);

	useEffect(() => {
		contextModeRef.current = contextMode;
	}, [contextMode]);

	const reloadMemories = useCallback(() => {
		void listAiMemories(memoryDocumentId, projectId).then(setMemories);
	}, [memoryDocumentId, projectId]);

	const reloadCodex = useCallback(() => {
		void listCodexItems({
			documentId: contextMode === 'general' ? undefined : documentId,
			projectId,
			includeAll: contextMode === 'general',
		}).then(setCodexItems);
	}, [contextMode, documentId, projectId]);

	const applyMemorySuggestions = useCallback(
		(assistantText: string) => {
			const currentSettings = loadAiSettings();

			if (!currentSettings.autoSuggestMemories) {
				setMemorySuggestions([]);
				return;
			}

			const defaultScope: AiMemory['scope'] = contextModeRef.current === 'general' ? 'global' : 'document';
			const suggestions = extractMemorySuggestions(assistantText).filter(
				(text) => !dismissedMemoryTextsRef.current.has(text.toLowerCase()),
			);

			void (async () => {
				for (const text of suggestions) {
					await createAiMemory({
						scope: defaultScope,
						documentId: defaultScope === 'document' ? memoryDocumentId : undefined,
						content: text,
						pinned: false,
						status: 'suggested',
					});
				}

				if (suggestions.length > 0) {
					reloadMemories();
				}
			})();

			setMemorySuggestions([]);
		},
		[memoryDocumentId, projectId, reloadMemories],
	);

	const dismissMemorySuggestion = useCallback((id: string) => {
		setMemorySuggestions((current) => {
			const suggestion = current.find((item) => item.id === id);

			if (suggestion) {
				dismissedMemoryTextsRef.current.add(suggestion.text.toLowerCase());
			}

			return current.filter((item) => item.id !== id);
		});
	}, []);

	const approveMemorySuggestion = useCallback(
		async (id: string, scope: AiMemory['scope']) => {
			const suggestion = memorySuggestions.find((item) => item.id === id);

			if (!suggestion) {
				return;
			}

			await createAiMemory({
				scope,
				documentId: scope === 'document' ? memoryDocumentId : undefined,
				projectId: scope === 'project' ? projectId : undefined,
				content: suggestion.text,
				pinned: true,
			});

			setMemorySuggestions((current) => current.filter((item) => item.id !== id));
			reloadMemories();
		},
		[memoryDocumentId, memorySuggestions, projectId, reloadMemories],
	);

	const setIncludeScriptContext = useCallback(
		(value: boolean) => {
			setIncludeScriptContextState(value);
			saveDocumentAiPrefs(threadDocumentId, { includeScriptContext: value });
			const nextSettings = { ...loadAiSettings(), includeScriptContext: value };
			saveAiSettings(nextSettings);
			setSettings(nextSettings);
		},
		[threadDocumentId],
	);

	const setIncludeWorkspaceContext = useCallback(
		(value: boolean) => {
			setIncludeWorkspaceContextState(value);
			saveDocumentAiPrefs(threadDocumentId, { includeWorkspaceContext: value });
			const nextSettings = { ...loadAiSettings(), includeWorkspaceContext: value };
			saveAiSettings(nextSettings);
			setSettings(nextSettings);
		},
		[threadDocumentId],
	);

	const setScriptContextSections = useCallback(
		(patch: Partial<ScriptContextSections>) => {
			setScriptContextSectionsState((current) => {
				const next = { ...current, ...patch };
				saveDocumentAiPrefs(threadDocumentId, { scriptContextSections: next });
				return next;
			});
		},
		[threadDocumentId],
	);

	const effectiveModel = useMemo(
		() => resolveEffectiveModel(selectedModel, settings),
		[selectedModel, settings],
	);
	const selectedProvider = effectiveModel.provider;
	const providerAdapter = useMemo(
		() => aiProviders.get(selectedProvider),
		[aiProviders, selectedProvider],
	);

	const pendingRelevanceQueryRef = useRef('');
	const systemPromptSnapshotRef = useRef<SystemPromptSnapshot>({
		contextMode,
		interactionMode,
		libraryDocuments,
		libraryProjects,
		globalRules: settings.globalRules,
		memories,
		codexItems,
		projectId,
		relevanceQuery: '',
		documentId,
		documentTitle,
		documentContent,
		workspace,
		documentRules,
		includeScriptContext,
		includeWorkspaceContext,
		scriptContextSections,
		selectionText: activeSelectionText,
		activeBlockIndex,
		activeWorkspaceTab,
		activeCollaborators,
	});

	systemPromptSnapshotRef.current = {
		contextMode,
		interactionMode,
		libraryDocuments,
		libraryProjects,
		globalRules: settings.globalRules,
		memories,
		codexItems,
		projectId,
		relevanceQuery: pendingRelevanceQueryRef.current || relevanceQuery,
		documentId,
		documentTitle,
		documentContent,
		workspace,
		documentRules,
		includeScriptContext,
		includeWorkspaceContext,
		scriptContextSections,
		selectionText: activeSelectionText,
		activeBlockIndex,
		activeWorkspaceTab,
		activeCollaborators,
	};

	const editorToolsEnabled =
		interactionModeEnablesTools(interactionMode) &&
		(hasAnyProviderConfigured(settings) ||
			(entitlements.canUseEditorAi() && (auth.isSignedIn() || isDevEditorAiEnabled())));

	const effectiveIncludeScriptContext = includeScriptContext;

	const refreshSettings = useCallback(() => {
		const loaded = loadAiSettings();
		setSettings(loaded);
		setIncludeScriptContextState(loaded.includeScriptContext);
		setIncludeWorkspaceContextState(loaded.includeWorkspaceContext);

		if (!loaded.autoSuggestMemories) {
			setMemorySuggestions([]);
		}
	}, []);

	useEffect(() => {
		void listAiMemories(memoryDocumentId, projectId).then(setMemories);
	}, [memoryDocumentId, projectId]);

	useEffect(() => {
		reloadCodex();
	}, [reloadCodex]);

	useEffect(() => {
		const onCodexChanged = () => reloadCodex();
		window.addEventListener('dastan:codex-changed', onCodexChanged);
		return () => window.removeEventListener('dastan:codex-changed', onCodexChanged);
	}, [reloadCodex]);

	useEffect(() => {
		activeThreadRef.current = activeThread;
	}, [activeThread]);

	useEffect(() => {
		settingsRef.current = settings;
	}, [settings]);

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: providerAdapter?.resolveChatApiUrl(settings) ?? settings.chatApiUrl,
				prepareSendMessagesRequest: async ({ body, messages: requestMessages }) => {
					const currentSettings = settingsRef.current;
					const modelForRequest = modelOverrideRef.current ?? selectedModel;
					modelOverrideRef.current = null;
					const resolved = resolveEffectiveModel(modelForRequest, currentSettings);
					lastResolvedModelRef.current = {
						modelId: resolved.modelId,
						modelSelection: modelForRequest,
					};
					const apiKey = aiProvidersRef.current.get(resolved.provider)?.resolveApiKey(currentSettings);
					const accessToken = auth.getAccessToken ? await auth.getAccessToken() : null;
					const { systemAppendix, messages: compressedMessages } = compressConversationHistory(requestMessages);
					const requestSystemBase = await resolveSystemPromptForRequest(systemPromptSnapshotRef.current);
					const requestSystem = systemAppendix ? `${requestSystemBase}\n\n${systemAppendix}` : requestSystemBase;

					return {
						body: {
							...body,
							messages: compressedMessages,
							provider: resolved.provider,
							model: resolved.modelId,
							system: requestSystem,
							interactionMode,
							enableTools: editorToolsEnabled,
							...(resolved.provider === 'ollama'
								? { ollamaBaseUrl: currentSettings.ollamaBaseUrl }
								: {}),
						},
						headers: {
							...(apiKey ? { 'x-api-key': apiKey } : {}),
							...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
						},
					};
				},
			}),
		[providerAdapter, settings, selectedModel, interactionMode, editorToolsEnabled, auth],
	);

	const persistThread = useCallback(
		async (nextMessages: UIMessage[]) => {
			const thread = activeThreadRef.current;

			if (!thread) {
				return;
			}

			const firstUserMessage = nextMessages.find((message) => message.role === 'user');
			const derivedTitle =
				thread.title === 'New chat' && firstUserMessage
					? getTextFromUiMessage(firstUserMessage).slice(0, 48) || thread.title
					: thread.title;

			const savedThread = await saveChatThread({
				...thread,
				roomId: collaborationRoomId ?? thread.roomId,
				model: selectedModel,
				provider: selectedProvider,
				title: derivedTitle,
				messages: uiMessagesToStored(nextMessages),
			});

			if (collaboration.isAvailable() && collaborationRoomId) {
				const room = collaboration.openRoom(collaborationRoomId);
				const senderUserId = auth.getUser()?.id;
				const storedMessages = uiMessagesToStored(nextMessages);
				const latestMessage = storedMessages.at(-1);

				if (latestMessage) {
					void room.publishChatMessage(
						toCollaborationChatMessage(thread.id, latestMessage, senderUserId),
					);
				}
			}

			setActiveThread(savedThread);
			onThreadChange(savedThread);
		},
		[auth, collaboration, collaborationRoomId, onThreadChange, selectedModel, selectedProvider],
	);

	const { messages, sendMessage, status, error, setMessages, stop, regenerate } = useChat({
		id: chatSessionId,
		transport,
		onFinish: ({ messages: finishedMessages }) => {
			void (async () => {
				const manifest = lastContextManifestRef.current;
				const resolvedModel = lastResolvedModelRef.current;
				let messagesToPersist = finishedMessages;

				const lastAssistantIndex = [...finishedMessages]
					.map((message, index) => ({ message, index }))
					.reverse()
					.find((entry) => entry.message.role === 'assistant')?.index;

				if (lastAssistantIndex !== undefined && (manifest || resolvedModel)) {
					messagesToPersist = finishedMessages.map((message, index) => {
						if (index !== lastAssistantIndex) {
							return message;
						}

						return {
							...message,
							...(manifest ? { contextManifest: manifest } : {}),
							...(resolvedModel
								? {
										modelId: resolvedModel.modelId,
										modelSelection: resolvedModel.modelSelection,
									}
								: {}),
						} as UIMessage;
					});
					setMessages(messagesToPersist);
					lastContextManifestRef.current = null;
					lastResolvedModelRef.current = null;
				}

				await persistThread(messagesToPersist);

				const lastAssistant = [...messagesToPersist].reverse().find((message) => message.role === 'assistant');

				if (!lastAssistant) {
					setMemorySuggestions([]);
					return;
				}

				if (editorToolsEnabled && onToolInvocations) {
					const invocations = extractToolInvocations(lastAssistant);

					if (invocations.length > 0) {
						onToolInvocations(invocations, lastAssistant.id);
					}
				}

				applyMemorySuggestions(getTextFromUiMessage(lastAssistant));
			})();
		},
	});

	useCollaborationChatSync({
		roomId: collaborationRoomId,
		threadId,
		setMessages,
	});

	useEffect(() => {
		if (!threadId) {
			activeThreadRef.current = null;
			setActiveThread(null);
			setMessages([]);
			return;
		}

		if (activeThreadRef.current?.id === threadId) {
			return;
		}

		let cancelled = false;

		void getChatThread(threadId).then((thread) => {
			if (cancelled || !thread) {
				return;
			}

			activeThreadRef.current = thread;
			setActiveThread(thread);
			setSelectedModel(thread.model || AUTO_MODEL_ID);
			setMessages(storedMessagesToUi(thread.messages));
		});

		return () => {
			cancelled = true;
		};
	}, [chatSessionId, threadId, setMessages]);

	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	useEffect(() => {
		statusRef.current = status;
	}, [status]);

	useEffect(() => {
		if (error?.message) {
			setSubmitError(error.message);
		}
	}, [error]);

	useEffect(() => {
		const handleBeforeUnload = () => {
			if (statusRef.current === 'streaming' || statusRef.current === 'submitted') {
				void persistThread(messagesRef.current);
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	}, [persistThread]);

	useEffect(() => {
		if (panelOpen) {
			return;
		}

		if (statusRef.current === 'streaming' || statusRef.current === 'submitted') {
			void persistThread(messagesRef.current);
		}
	}, [panelOpen, persistThread]);

	useEffect(() => {
		return () => {
			if (statusRef.current === 'streaming' || statusRef.current === 'submitted') {
				void persistThread(messagesRef.current);
			}
		};
	}, [persistThread]);

	const startNewThread = useCallback(async () => {
		const thread = await createChatThread({
			documentId: threadDocumentId,
			roomId: collaborationRoomId ?? undefined,
			model: selectedModel,
			provider: selectedProvider,
		});

		activeThreadRef.current = thread;
		setActiveThread(thread);
		setMessages([]);
		setMemorySuggestions([]);
		onThreadCreated(thread);
		return thread;
	}, [collaborationRoomId, onThreadCreated, selectedModel, selectedProvider, setMessages, threadDocumentId]);

	const selectThread = useCallback(
		async (nextThreadId: string) => {
			const thread = await getChatThread(nextThreadId);

			if (!thread) {
				return;
			}

			activeThreadRef.current = thread;
			setActiveThread(thread);
			setSelectedModel(thread.model || AUTO_MODEL_ID);
			setMessages(storedMessagesToUi(thread.messages));
			onThreadChange(thread);
		},
		[onThreadChange, setMessages],
	);

	const hasProviderConfigured = hasAnyProviderConfigured(settings);
	const usingCredits = Boolean(aiProviders.get('dastan-cloud'));
	const creditsRemaining = entitlements.dailyAiPromptsRemaining();
	const hasCreditsAvailable = creditsRemaining === 'unlimited' || creditsRemaining > 0;
	const modelConfigurationError = getModelConfigurationError(settings, selectedModel);
	const canSend =
		modelConfigurationError === null && (hasProviderConfigured || (usingCredits && hasCreditsAvailable));
	const isLongConversation = messages.length >= LONG_CONVERSATION_MESSAGE_THRESHOLD;
	const conversationLong = messages.length >= 20;

	const submitMessage = useCallback(
		async (text: string) => {
			const trimmed = text.trim();

			if (!trimmed || status === 'streaming' || status === 'submitted') {
				return false;
			}

			if (!navigator.onLine) {
				setSubmitError('You appear to be offline. Reconnect and try again.');
				return false;
			}

			if (!canSend) {
				setSubmitError(
					modelConfigurationError ??
						'Add an API key in Settings → AI to use the writing assistant.',
				);
				return false;
			}

			if (!activeThreadRef.current) {
				await startNewThread();
			}

			setSubmitError(null);
			setMemorySuggestions([]);
			pendingRelevanceQueryRef.current = trimmed;
			setRelevanceQuery(trimmed);

			lastContextManifestRef.current = toStoredContextManifest(
				buildContextManifest({
					documentContent: contextMode === 'general' ? null : documentContent,
					workspace,
					globalRules: settings.globalRules,
					documentRules,
					memories,
					codexItems,
					documentId: contextMode === 'general' ? undefined : documentId,
					projectId,
					includeScriptContext: contextMode !== 'general' && includeScriptContext,
					includeWorkspaceContext: contextMode !== 'general' && includeWorkspaceContext,
					scriptContextSections,
					selectionText: activeSelectionText,
					activeBlockIndex,
					relevanceQuery: trimmed,
				}),
			);

			try {
				await sendMessage({ text: trimmed });
				return true;
			} catch (sendError) {
				const message = sendError instanceof Error ? sendError.message : 'Unable to reach the writing assistant.';
				setSubmitError(message);
				return false;
			}
		},
		[
			activeBlockIndex,
			activeSelectionText,
			canSend,
			contextMode,
			documentContent,
			documentId,
			documentRules,
			includeScriptContext,
			includeWorkspaceContext,
			memories,
			codexItems,
			modelConfigurationError,
			projectId,
			scriptContextSections,
			sendMessage,
			settings.globalRules,
			startNewThread,
			status,
			workspace,
		],
	);

	const editMessage = useCallback(
		async (messageId: string, newText: string) => {
			const trimmed = newText.trim();
			const messageIndex = messages.findIndex((message) => message.id === messageId);

			if (messageIndex === -1 || !trimmed || status === 'streaming' || status === 'submitted') {
				return false;
			}

			const priorMessages = messages.slice(0, messageIndex);
			setMessages(priorMessages);
			await persistThread(priorMessages);

			try {
				await sendMessage({ text: trimmed });
				return true;
			} catch (sendError) {
				const message = sendError instanceof Error ? sendError.message : 'Unable to reach the writing assistant.';
				setSubmitError(message);
				return false;
			}
		},
		[messages, persistThread, sendMessage, setMessages, status],
	);

	const regenerateWithModel = useCallback(
		(modelId: string) => {
			modelOverrideRef.current = modelId;
			setSelectedModel(modelId);
			void regenerate();
		},
		[regenerate],
	);

	const setSelectedModelForDocument = useCallback(
		(modelId: string) => {
			setSelectedModel(modelId);
			saveDocumentAiPrefs(threadDocumentId, { selectedModel: modelId });
		},
		[threadDocumentId],
	);

	return {
		messages,
		status,
		error: submitError ?? error?.message ?? null,
		memories,
		codexItems,
		settings,
		interactionMode,
		selectedModel,
		selectedProvider,
		includeScriptContext,
		effectiveIncludeScriptContext,
		includeWorkspaceContext,
		scriptContextSections,
		documentRules,
		selectionActive,
		activeSelectionText,
		isLongConversation,
		conversationLong,
		activeThread,
		canSend,
		hasProviderConfigured,
		modelConfigurationError,
		isModelConfigured: isModelConfigured(settings, selectedModel),
		usingCredits,
		creditsRemaining,
		suggestedMemoriesCount,
		includedMemoriesCount,
		availableModels: getAvailableModels(settings),
		allModels: AI_MODEL_REGISTRY,
		setSelectedModel: setSelectedModelForDocument,
		setIncludeScriptContext,
		setIncludeWorkspaceContext,
		setScriptContextSections,
		refreshSettings,
		startNewThread,
		selectThread,
		submitMessage,
		editMessage,
		stop,
		regenerate,
		regenerateWithModel,
		memorySuggestions,
		dismissMemorySuggestion,
		approveMemorySuggestion,
		reloadMemories,
	};
}
