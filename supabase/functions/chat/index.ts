// Supabase Edge Function — BYOK AI chat proxy for production.
// Logic mirrors @dastan/ai-providers/server (packages/ai-providers/src/server/chat-handler.ts).

import { anthropic } from 'npm:@ai-sdk/anthropic@2';
import { openai } from 'npm:@ai-sdk/openai@2';
import { convertToModelMessages, streamText, tool, type UIMessage } from 'npm:ai@5';
import { z } from 'npm:zod@3';

type ChatProvider = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'ollama';

interface ChatRequestBody {
	messages: UIMessage[];
	provider?: ChatProvider;
	model?: string;
	system?: string;
	ollamaBaseUrl?: string;
	enableTools?: boolean;
}

const defaultOllamaBaseUrl = 'http://localhost:11434/v1';
const MAX_HISTORY_MESSAGES = 40;

function truncateMessageHistory(messages: UIMessage[]): UIMessage[] {
	if (messages.length <= MAX_HISTORY_MESSAGES) {
		return messages;
	}

	return messages.slice(-MAX_HISTORY_MESSAGES);
}

function createEditorAiTools() {
	return {
		insert_scene: tool({
			description: 'Insert a new properly-typed scene into the screenplay.',
			parameters: z.object({
				sceneHeading: z.string(),
				action: z.string().optional(),
				character: z.string().optional(),
				dialogue: z.string().optional(),
			}),
		}),
		rewrite_dialogue: tool({
			description: 'Rewrite dialogue for a specific character in the screenplay.',
			parameters: z.object({
				character: z.string(),
				newDialogue: z.string(),
				sceneIndex: z.number().optional(),
			}),
		}),
		update_beat: tool({
			description: 'Update a beat on the beat board.',
			parameters: z.object({
				beatId: z.string().optional(),
				heading: z.string().optional(),
				beat: z.string(),
			}),
		}),
		edit_character: tool({
			description: 'Update a character profile in the World tab.',
			parameters: z.object({
				name: z.string(),
				age: z.string().optional(),
				arc: z.string().optional(),
				notes: z.string().optional(),
			}),
		}),
		update_outline: tool({
			description: 'Update a structure beat in the outline.',
			parameters: z.object({
				beatLabel: z.string(),
				summary: z.string(),
			}),
		}),
		update_notes: tool({
			description: 'Update global notes for the script.',
			parameters: z.object({
				notes: z.string(),
			}),
		}),
	};
}

function resolveModel(provider: ChatProvider, model: string, apiKey: string, ollamaBaseUrl?: string) {
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
		case 'ollama':
			return openai(model, {
				apiKey: 'ollama',
				baseURL: ollamaBaseUrl?.trim() || defaultOllamaBaseUrl,
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
	const authHeader = request.headers.get('authorization')?.trim();

	let body: ChatRequestBody;

	try {
		body = (await request.json()) as ChatRequestBody;
	} catch {
		return new Response('Invalid request body.', { status: 400, headers: corsHeaders });
	}

	const provider = body.provider ?? 'anthropic';
	const enableTools = body.enableTools === true;

	if (!apiKey && provider !== 'ollama') {
		return new Response('Missing API key. Add a provider key in Settings → AI.', {
			status: 401,
			headers: corsHeaders,
		});
	}

	if (enableTools && !authHeader) {
		return new Response('Editor AI requires a signed-in account with editor access.', {
			status: 403,
			headers: corsHeaders,
		});
	}

	if (provider === 'ollama' && !body.ollamaBaseUrl?.trim()) {
		return new Response('Missing Ollama endpoint. Set it in Settings → AI.', {
			status: 400,
			headers: corsHeaders,
		});
	}

	const model = body.model ?? (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : provider === 'ollama' ? 'llama3.2' : 'gpt-4o');

	try {
		const result = streamText({
			model: resolveModel(provider, model, apiKey ?? 'ollama', body.ollamaBaseUrl),
			system: body.system ?? 'You are a helpful screenplay writing assistant.',
			messages: await convertToModelMessages(truncateMessageHistory(body.messages ?? [])),
			tools: enableTools ? createEditorAiTools() : undefined,
			maxSteps: enableTools ? 5 : undefined,
		});

		const response = result.toUIMessageStreamResponse();

		response.headers.set('Access-Control-Allow-Origin', '*');
		return response;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to generate response.';
		return new Response(message, { status: 500, headers: corsHeaders });
	}
});
