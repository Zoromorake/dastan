import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { createEditorAiTools } from './editor-tools';

export type ChatProvider = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'ollama';

export interface ChatRequestBody {
	messages: UIMessage[];
	provider?: ChatProvider;
	model?: string;
	system?: string;
	ollamaBaseUrl?: string;
	enableTools?: boolean;
	interactionMode?: 'ask' | 'planner' | 'editor';
}

const defaultOllamaBaseUrl = 'http://localhost:11434/v1';

/**
 * Hard cap on how many turns are sent to the model per request. The system prompt already
 * carries the durable context (script, workspace, memories), so once a conversation grows
 * past this length we drop the oldest turns rather than let cost/latency grow unbounded —
 * the client-side UI separately nudges the user to start a new chat well before this kicks in.
 */
const MAX_HISTORY_MESSAGES = 40;

function truncateMessageHistory(messages: UIMessage[]): UIMessage[] {
	if (messages.length <= MAX_HISTORY_MESSAGES) {
		return messages;
	}

	return messages.slice(-MAX_HISTORY_MESSAGES);
}

function resolveModel(provider: ChatProvider, model: string, apiKey: string, ollamaBaseUrl?: string) {
	switch (provider) {
		case 'openai':
			return createOpenAI({ apiKey }).chat(model);
		case 'anthropic':
			return createAnthropic({ apiKey })(model);
		case 'openrouter':
			return createOpenAI({
				apiKey,
				baseURL: 'https://openrouter.ai/api/v1',
			}).chat(model);
		case 'google':
			return createOpenAI({
				apiKey,
				baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
			}).chat(model);
		case 'ollama':
			return createOpenAI({
				apiKey: 'ollama',
				baseURL: ollamaBaseUrl?.trim() || defaultOllamaBaseUrl,
			}).chat(model);
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}

export async function handleChatRequest(request: Request): Promise<Response> {
	let body: ChatRequestBody;

	try {
		body = (await request.json()) as ChatRequestBody;
	} catch {
		return new Response('Invalid request body.', { status: 400 });
	}

	const provider = body.provider ?? 'anthropic';
	const apiKey = request.headers.get('x-api-key')?.trim();

	if (!apiKey && provider !== 'ollama') {
		return new Response('Missing API key. Add a provider key in Settings → AI.', { status: 401 });
	}

	if (provider === 'ollama' && !body.ollamaBaseUrl?.trim()) {
		return new Response('Missing Ollama endpoint. Set it in Settings → AI.', { status: 400 });
	}

	const model = body.model ?? (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : provider === 'ollama' ? 'llama3.2' : 'gpt-4o');
	const enableTools = body.enableTools === true;
	const authHeader = request.headers.get('authorization')?.trim();
	const devEditorTools = request.headers.get('x-dastan-dev-editor') === '1';

	if (enableTools && !authHeader && !devEditorTools) {
		return new Response('Editor AI requires a signed-in account with editor access.', { status: 403 });
	}

	try {
		const result = streamText({
			model: resolveModel(provider, model, apiKey ?? 'ollama', body.ollamaBaseUrl),
			system: body.system ?? 'You are a helpful screenplay writing assistant.',
			messages: await convertToModelMessages(truncateMessageHistory(body.messages ?? [])),
			tools: enableTools ? createEditorAiTools() : undefined,
			maxSteps: enableTools ? 5 : undefined,
		});

		return result.toUIMessageStreamResponse();
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to generate response.';
		return new Response(message, { status: 500 });
	}
}
