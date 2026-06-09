import type { AiProvider } from './ai-settings';

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
};

export const AI_MODEL_REGISTRY: AiModelOption[] = [
	{ id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
	{ id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
	{ id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'anthropic' },
	{ id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'anthropic' },
	{ id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', provider: 'openrouter' },
	{ id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 (Router)', provider: 'openrouter' },
];

export function getModelsForProvider(provider: AiProvider): AiModelOption[] {
	return AI_MODEL_REGISTRY.filter((model) => model.provider === provider);
}

export function getAvailableModels(apiKeys: Partial<Record<AiProvider, string>>): AiModelOption[] {
	const configuredProviders = new Set(
		(Object.entries(apiKeys) as Array<[AiProvider, string | undefined]>)
			.filter(([, key]) => typeof key === 'string' && key.trim().length > 0)
			.map(([provider]) => provider),
	);

	if (configuredProviders.size === 0) {
		return [];
	}

	return AI_MODEL_REGISTRY.filter((model) => configuredProviders.has(model.provider));
}

export function resolveModelOption(modelId: string): AiModelOption | undefined {
	return AI_MODEL_REGISTRY.find((model) => model.id === modelId);
}
