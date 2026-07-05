import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { JSONContent } from '@tiptap/core';
import type { ScreenplayDocumentRecord, ScreenplayWorkspaceData } from '../types';
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

function uiMessagesToStored(messages: UIMessage[]): AiChatMessage[] {
	return messages
		.filter((message) => message.role === 'user' || message.role === 'assistant')
		.map((message) => ({
			id: message.id,
			role: message.role,
			content: getTextFromUiMessage(message),
			createdAt: new Date().toISOString(),
		}));
}

function storedMessagesToUi(messages: AiChatMessage[]): UIMessage[] {
	return messages.map((message) => ({
		id: message.id,
		role: message.role,
		parts: [{ type: 'text', text: message.content }],
	}));
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
	threadId: string | null;
	roomId?: string | null;
	activeCollaborators?: CollaboratorPresence[];
	panelOpen?: boolean;
	selectionText?: string | null;
	activeBlockIndex?: number | null;
	activeWorkspaceTab?: string | null;
	onToolInvocations?: (invocations: Array<{ toolName: string; input: unknown }>) => void;
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
	const [activeThread, setActiveThread] = useState<AiChatThread | null>(null);
	const [includeScriptContext, setIncludeScriptContextState] = useState(settings.includeScriptContext);
	const [includeWorkspaceContext, setIncludeWorkspaceContextState] = useState(settings.includeWorkspaceContext);
	const [selectedModel, setSelectedModel] = useState(AUTO_MODEL_ID);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [memorySuggestions, setMemorySuggestions] = useState<MemorySuggestion[]>([]);
	const activeThreadRef = useRef<AiChatThread | null>(null);
	const messagesRef = useRef<UIMessage[]>([]);
	const statusRef = useRef<'submitted' | 'streaming' | 'ready' | 'error'>('ready');
	const modelOverrideRef = useRef<string | null>(null);
	const dismissedMemoryTextsRef = useRef<Set<string>>(new Set());
	const contextModeRef = useRef(contextMode);
	const memoryDocumentId = contextMode === 'general' ? GENERAL_CHAT_DOCUMENT_ID : threadDocumentId;
	const collaborationRoomId = collaboration.isAvailable() ? (roomId ?? threadDocumentId) : null;

	const activeSelectionText = selectionText?.trim() || null;
	const selectionActive = Boolean(activeSelectionText);

	useEffect(() => {
		contextModeRef.current = contextMode;
	}, [contextMode]);

	const reloadMemories = useCallback(() => {
		void listAiMemories(memoryDocumentId, projectId).then(setMemories);
	}, [memoryDocumentId, projectId]);

	const applyMemorySuggestions = useCallback((assistantText: string) => {
		const currentSettings = loadAiSettings();

		if (!currentSettings.autoSuggestMemories) {
			setMemorySuggestions([]);
			return;
		}

		const defaultScope: AiMemory['scope'] = contextModeRef.current === 'general' ? 'global' : 'document';
		const suggestions = extractMemorySuggestions(assistantText)
			.filter((text) => !dismissedMemoryTextsRef.current.has(text.toLowerCase()))
			.map((text) => ({
				id: globalThis.crypto.randomUUID(),
				text,
				suggestedScope: defaultScope,
			}));

		setMemorySuggestions(suggestions);
	}, []);

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

	const setIncludeScriptContext = useCallback((value: boolean) => {
		setIncludeScriptContextState(value);
		const nextSettings = { ...loadAiSettings(), includeScriptContext: value };
		saveAiSettings(nextSettings);
		setSettings(nextSettings);
	}, []);

	const setIncludeWorkspaceContext = useCallback((value: boolean) => {
		setIncludeWorkspaceContextState(value);
		const nextSettings = { ...loadAiSettings(), includeWorkspaceContext: value };
		saveAiSettings(nextSettings);
		setSettings(nextSettings);
	}, []);

	const effectiveModel = useMemo(
		() => resolveEffectiveModel(selectedModel, settings),
		[selectedModel, settings],
	);
	const selectedProvider = effectiveModel.provider;
	const providerAdapter = useMemo(
		() => aiProviders.get(selectedProvider),
		[aiProviders, selectedProvider],
	);

	const systemPrompt = useMemo(() => {
		if (contextMode === 'general') {
			return buildGeneralAiContext({
				documents: libraryDocuments,
				globalRules: settings.globalRules,
				memories,
				projectId,
				interactionMode,
			}).systemPrompt;
		}

		return buildAiContext({
			documentId,
			documentTitle,
			documentContent,
			workspace,
			globalRules: settings.globalRules,
			memories,
			projectId,
			includeScriptContext,
			includeWorkspaceContext,
			selectionText: activeSelectionText,
			activeBlockIndex,
			interactionMode,
			activeWorkspaceTab,
			activeCollaborators,
		}).systemPrompt;
	}, [
		contextMode,
		interactionMode,
		documentId,
		documentTitle,
		documentContent,
		workspace,
		settings.globalRules,
		memories,
		projectId,
		includeScriptContext,
		includeWorkspaceContext,
		activeSelectionText,
		activeBlockIndex,
		activeWorkspaceTab,
		activeCollaborators,
		libraryDocuments,
	]);

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
					const apiKey = aiProvidersRef.current.get(resolved.provider)?.resolveApiKey(currentSettings);
					const accessToken = auth.getAccessToken ? await auth.getAccessToken() : null;
					const { systemAppendix, messages: compressedMessages } = compressConversationHistory(requestMessages);
					const requestSystem = systemAppendix ? `${systemPrompt}\n\n${systemAppendix}` : systemPrompt;

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
		[providerAdapter, settings, selectedModel, systemPrompt, interactionMode, editorToolsEnabled, auth],
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
				await persistThread(finishedMessages);

				const lastAssistant = [...finishedMessages].reverse().find((message) => message.role === 'assistant');

				if (!lastAssistant) {
					setMemorySuggestions([]);
					return;
				}

				if (editorToolsEnabled && onToolInvocations) {
					const invocations = extractToolInvocations(lastAssistant);

					if (invocations.length > 0) {
						onToolInvocations(invocations);
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

			try {
				await sendMessage({ text: trimmed });
				return true;
			} catch (sendError) {
				const message = sendError instanceof Error ? sendError.message : 'Unable to reach the writing assistant.';
				setSubmitError(message);
				return false;
			}
		},
		[canSend, modelConfigurationError, persistThread, sendMessage, startNewThread, status],
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

	return {
		messages,
		status,
		error: submitError ?? error?.message ?? null,
		memories,
		settings,
		interactionMode,
		selectedModel,
		selectedProvider,
		includeScriptContext,
		effectiveIncludeScriptContext,
		includeWorkspaceContext,
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
		availableModels: getAvailableModels(settings),
		allModels: AI_MODEL_REGISTRY,
		setSelectedModel,
		setIncludeScriptContext,
		setIncludeWorkspaceContext,
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
