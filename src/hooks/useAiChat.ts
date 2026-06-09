import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { JSONContent } from '@tiptap/core';
import type { ScreenplayWorkspaceData } from '../types';
import { buildAiContext } from '../utils/ai-context';
import {
	createChatThread,
	getChatThread,
	listAiMemories,
	saveChatThread,
	type AiChatMessage,
	type AiChatThread,
} from '../utils/ai-memory-storage';
import { resolveModelOption } from '../utils/ai-models';
import { getApiKeyForProvider, loadAiSettings, type AiSettings } from '../utils/ai-settings';

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
	documentId: string;
	documentTitle: string;
	documentContent: JSONContent | null;
	workspace: ScreenplayWorkspaceData;
	threadId: string | null;
	onThreadChange: (thread: AiChatThread) => void;
	onThreadCreated: (thread: AiChatThread) => void;
}

export function useAiChat({
	documentId,
	documentTitle,
	documentContent,
	workspace,
	threadId,
	onThreadChange,
	onThreadCreated,
}: UseAiChatOptions) {
	const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings());
	const [memories, setMemories] = useState<Awaited<ReturnType<typeof listAiMemories>>>([]);
	const [activeThread, setActiveThread] = useState<AiChatThread | null>(null);
	const [includeScriptContext, setIncludeScriptContext] = useState(settings.includeScriptContext);
	const [includeWorkspaceContext, setIncludeWorkspaceContext] = useState(settings.includeWorkspaceContext);
	const [selectedModel, setSelectedModel] = useState(settings.defaultModel);
	const activeThreadRef = useRef<AiChatThread | null>(null);

	const selectedModelOption = useMemo(() => resolveModelOption(selectedModel), [selectedModel]);
	const selectedProvider = selectedModelOption?.provider ?? settings.defaultProvider;

	const systemPrompt = useMemo(
		() =>
			buildAiContext({
				documentTitle,
				documentContent,
				workspace,
				globalRules: settings.globalRules,
				memories,
				includeScriptContext,
				includeWorkspaceContext,
			}).systemPrompt,
		[documentTitle, documentContent, workspace, settings.globalRules, memories, includeScriptContext, includeWorkspaceContext],
	);

	const refreshSettings = useCallback(() => {
		const nextSettings = loadAiSettings();
		setSettings(nextSettings);
		setIncludeScriptContext(nextSettings.includeScriptContext);
		setIncludeWorkspaceContext(nextSettings.includeWorkspaceContext);
		setSelectedModel(nextSettings.defaultModel);
	}, []);

	useEffect(() => {
		void listAiMemories(documentId).then(setMemories);
	}, [documentId]);

	useEffect(() => {
		activeThreadRef.current = activeThread;
	}, [activeThread]);

	useEffect(() => {
		if (!threadId) {
			setActiveThread(null);
			return;
		}

		void getChatThread(threadId).then((thread) => {
			if (thread) {
				setActiveThread(thread);
				setSelectedModel(thread.model);
			}
		});
	}, [threadId]);

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: settings.chatApiUrl,
				prepareSendMessagesRequest: async ({ body, messages }) => {
					const apiKey = getApiKeyForProvider(settings, selectedProvider);

					return {
						body: {
							...body,
							messages,
							provider: selectedProvider,
							model: selectedModel,
							system: systemPrompt,
						},
						headers: apiKey
							? {
									'x-api-key': apiKey,
								}
							: undefined,
					};
				},
			}),
		[settings, selectedProvider, selectedModel, systemPrompt],
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
				model: selectedModel,
				provider: selectedProvider,
				title: derivedTitle,
				messages: uiMessagesToStored(nextMessages),
			});

			setActiveThread(savedThread);
			onThreadChange(savedThread);
		},
		[onThreadChange, selectedModel, selectedProvider],
	);

	const { messages, sendMessage, status, error, setMessages, stop, regenerate } = useChat({
		id: activeThread?.id,
		messages: activeThread ? storedMessagesToUi(activeThread.messages) : [],
		transport,
		onFinish: ({ messages: finishedMessages }) => {
			void persistThread(finishedMessages);
		},
	});

	useEffect(() => {
		if (!activeThread) {
			setMessages([]);
			return;
		}

		setMessages(storedMessagesToUi(activeThread.messages));
	}, [activeThread?.id, setMessages]);

	const startNewThread = useCallback(async () => {
		const thread = await createChatThread({
			documentId,
			model: selectedModel,
			provider: selectedProvider,
		});

		setActiveThread(thread);
		setMessages([]);
		onThreadCreated(thread);
		return thread;
	}, [documentId, onThreadCreated, selectedModel, selectedProvider, setMessages]);

	const selectThread = useCallback(
		async (nextThreadId: string) => {
			const thread = await getChatThread(nextThreadId);

			if (!thread) {
				return;
			}

			setActiveThread(thread);
			setSelectedModel(thread.model);
			onThreadChange(thread);
		},
		[onThreadChange],
	);

	const submitMessage = useCallback(
		async (text: string) => {
			const trimmed = text.trim();

			if (!trimmed || status === 'streaming' || status === 'submitted') {
				return;
			}

			if (!activeThreadRef.current) {
				await startNewThread();
			}

			const apiKey = getApiKeyForProvider(settings, selectedProvider);

			if (!apiKey) {
				throw new Error(`Add an API key for ${selectedProvider} in Settings → AI.`);
			}

			await sendMessage({ text: trimmed });
		},
		[selectedProvider, sendMessage, settings, startNewThread, status],
	);

	return {
		messages,
		status,
		error,
		memories,
		settings,
		selectedModel,
		selectedProvider,
		includeScriptContext,
		includeWorkspaceContext,
		activeThread,
		setSelectedModel,
		setIncludeScriptContext,
		setIncludeWorkspaceContext,
		refreshSettings,
		startNewThread,
		selectThread,
		submitMessage,
		stop,
		regenerate,
		reloadMemories: () => void listAiMemories(documentId).then(setMemories),
	};
}
