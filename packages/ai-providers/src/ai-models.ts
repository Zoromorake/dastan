import type { AiProvider } from './ai-settings';
import { isProviderConfigured, type AiSettings } from './ai-settings';

export interface AiModelOption {
	id: string;
	label: string;
	provider: AiProvider;
}

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
	openai: 'OpenAI',
	anthropic: 'Anthropic',
	google: 'Google',
	openrouter: 'OpenRouter',
	ollama: 'Ollama',
};

export const AI_MODEL_REGISTRY: AiModelOption[] = [
	{ id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
	{ id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
	{ id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'anthropic' },
	{ id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'anthropic' },
	{ id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', provider: 'openrouter' },
	{ id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 (Router)', provider: 'openrouter' },
	{ id: 'llama3.2', label: 'Llama 3.2', provider: 'ollama' },
	{ id: 'mistral', label: 'Mistral', provider: 'ollama' },
	{ id: 'qwen2.5', label: 'Qwen 2.5', provider: 'ollama' },
];

export function getModelsForProvider(provider: AiProvider): AiModelOption[] {
	return AI_MODEL_REGISTRY.filter((model) => model.provider === provider);
}

export function getAvailableModels(settings: Pick<AiSettings, 'apiKeys' | 'ollamaBaseUrl'>): AiModelOption[] {
	const configuredProviders = new Set<AiProvider>();

	for (const model of AI_MODEL_REGISTRY) {
		if (isProviderConfigured(settings as AiSettings, model.provider)) {
			configuredProviders.add(model.provider);
		}
	}

	if (configuredProviders.size === 0) {
		return [];
	}

	return AI_MODEL_REGISTRY.filter((model) => configuredProviders.has(model.provider));
}

export function resolveModelOption(modelId: string): AiModelOption | undefined {
	return AI_MODEL_REGISTRY.find((model) => model.id === modelId);
}
