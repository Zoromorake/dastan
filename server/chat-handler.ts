import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';

export type ChatProvider = 'openai' | 'anthropic' | 'google' | 'openrouter';

export interface ChatRequestBody {
	messages: UIMessage[];
	provider?: ChatProvider;
	model?: string;
	system?: string;
}

function resolveModel(provider: ChatProvider, model: string, apiKey: string) {
	switch (provider) {
		case 'openai':
			return openai(model, { apiKey });
		case 'anthropic':
			return anthropic(model, { apiKey });
		case 'openrouter':
			return openai(model, {
				apiKey,
				baseURL: 'https://openrouter.ai/api/v1',
			});
		case 'google':
			return openai(model, {
				apiKey,
				baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
			});
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}

export async function handleChatRequest(request: Request): Promise<Response> {
	const apiKey = request.headers.get('x-api-key')?.trim();

	if (!apiKey) {
		return new Response('Missing API key. Add a provider key in Settings → AI.', { status: 401 });
	}

	let body: ChatRequestBody;

	try {
		body = (await request.json()) as ChatRequestBody;
	} catch {
		return new Response('Invalid request body.', { status: 400 });
	}

	const provider = body.provider ?? 'anthropic';
	const model = body.model ?? (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o');

	try {
		const result = streamText({
			model: resolveModel(provider, model, apiKey),
			system: body.system ?? 'You are a helpful screenplay writing assistant.',
			messages: await convertToModelMessages(body.messages ?? []),
		});

		return result.toUIMessageStreamResponse();
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to generate response.';
		return new Response(message, { status: 500 });
	}
}
