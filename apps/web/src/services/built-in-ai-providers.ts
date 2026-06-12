import type { AiProviderAdapter } from '@dastan/plugin-api';
import { getApiKeyForProvider, type AiProvider } from '@dastan/ai-providers';

const PROVIDER_LABELS: Record<AiProvider, string> = {
	openai: 'OpenAI',
	anthropic: 'Anthropic',
	google: 'Google',
	openrouter: 'OpenRouter',
	ollama: 'Ollama',
};

function createByokAdapter(id: AiProvider, requiresApiKey: boolean): AiProviderAdapter {
	return {
		id,
		label: PROVIDER_LABELS[id],
		requiresApiKey,
		supportsStreaming: true,
		resolveApiKey(settings) {
			return getApiKeyForProvider(settings, id);
		},
		resolveChatApiUrl(settings) {
			return settings.chatApiUrl;
		},
	};
}

export const builtInAiProviders: AiProviderAdapter[] = [
	createByokAdapter('openai', true),
	createByokAdapter('anthropic', true),
	createByokAdapter('google', true),
	createByokAdapter('openrouter', true),
	createByokAdapter('ollama', false),
];
