import { anthropic } from 'npm:@ai-sdk/anthropic@2';
import { openai } from 'npm:@ai-sdk/openai@2';
import { convertToModelMessages, streamText, type UIMessage } from 'npm:ai@5';

type ChatProvider = 'openai' | 'anthropic' | 'google' | 'openrouter';

interface ChatRequestBody {
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

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (request) => {
	if (request.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405, headers: corsHeaders });
	}

	const apiKey = request.headers.get('x-api-key')?.trim();

	if (!apiKey) {
		return new Response('Missing API key. Add a provider key in Settings → AI.', {
			status: 401,
			headers: corsHeaders,
		});
	}

	let body: ChatRequestBody;

	try {
		body = (await request.json()) as ChatRequestBody;
	} catch {
		return new Response('Invalid request body.', { status: 400, headers: corsHeaders });
	}

	const provider = body.provider ?? 'anthropic';
	const model = body.model ?? (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o');

	try {
		const result = streamText({
			model: resolveModel(provider, model, apiKey),
			system: body.system ?? 'You are a helpful screenplay writing assistant.',
			messages: await convertToModelMessages(body.messages ?? []),
		});

		const response = result.toUIMessageStreamResponse();

		response.headers.set('Access-Control-Allow-Origin', '*');
		return response;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to generate response.';
		return new Response(message, { status: 500, headers: corsHeaders });
	}
});
