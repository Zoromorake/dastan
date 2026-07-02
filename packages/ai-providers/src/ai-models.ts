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
	// OpenAI
	{ id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
	{ id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
	{ id: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai' },
	{ id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai' },
	{ id: 'o3-mini', label: 'o3-mini', provider: 'openai' },
	// Anthropic
	{ id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'anthropic' },
	{ id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'anthropic' },
	{ id: 'claude-opus-4-20250514', label: 'Claude Opus 4', provider: 'anthropic' },
	// Google (direct Gemini API, OpenAI-compatible endpoint)
	{ id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'google' },
	{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'google' },
	{ id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'google' },
	// OpenRouter
	{ id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', provider: 'openrouter' },
	{ id: 'google/gemini-2.5-pro-preview', label: 'Gemini 2.5 Pro', provider: 'openrouter' },
	{ id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 (Router)', provider: 'openrouter' },
	{ id: 'anthropic/claude-opus-4', label: 'Claude Opus 4 (Router)', provider: 'openrouter' },
	{ id: 'openai/gpt-4o', label: 'GPT-4o (Router)', provider: 'openrouter' },
	{ id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', provider: 'openrouter' },
	{ id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', provider: 'openrouter' },
	// Ollama (local)
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

export const AUTO_MODEL_ID = 'auto';

/** Cheapest-first priority when the user selects Auto. */
const AUTO_MODEL_PRIORITY: string[] = [
	'gpt-4o-mini',
	'gpt-4.1-mini',
	'claude-3-5-haiku-20241022',
	'gemini-2.5-flash',
	'gemini-2.0-flash',
	'google/gemini-2.0-flash-001',
	'deepseek/deepseek-chat',
	'llama3.2',
	'mistral',
	'qwen2.5',
	'o3-mini',
	'gpt-4o',
	'gpt-4.1',
	'claude-sonnet-4-20250514',
	'anthropic/claude-sonnet-4',
	'openai/gpt-4o',
	'gemini-2.5-pro',
	'google/gemini-2.5-pro-preview',
	'meta-llama/llama-3.3-70b-instruct',
	'claude-opus-4-20250514',
	'anthropic/claude-opus-4',
];

export function resolveAutoModel(
	settings: Pick<AiSettings, 'apiKeys' | 'ollamaBaseUrl'>,
): { modelId: string; provider: AiProvider } | null {
	const available = getAvailableModels(settings);
	const availableIds = new Set(available.map((model) => model.id));

	for (const modelId of AUTO_MODEL_PRIORITY) {
		if (!availableIds.has(modelId)) {
			continue;
		}

		const option = resolveModelOption(modelId);

		if (option) {
			return { modelId: option.id, provider: option.provider };
		}
	}

	if (available.length > 0) {
		return { modelId: available[0].id, provider: available[0].provider };
	}

	return null;
}

export function hasAnyProviderConfigured(settings: Pick<AiSettings, 'apiKeys' | 'ollamaBaseUrl'>): boolean {
	return AI_MODEL_REGISTRY.some((model) => isProviderConfigured(settings as AiSettings, model.provider));
}

export function isModelConfigured(
	settings: Pick<AiSettings, 'apiKeys' | 'ollamaBaseUrl'>,
	modelId: string,
): boolean {
	if (modelId === AUTO_MODEL_ID) {
		return hasAnyProviderConfigured(settings);
	}

	const option = resolveModelOption(modelId);

	if (!option) {
		return false;
	}

	return isProviderConfigured(settings as AiSettings, option.provider);
}

export function getModelConfigurationError(
	settings: Pick<AiSettings, 'apiKeys' | 'ollamaBaseUrl'>,
	modelId: string,
): string | null {
	if (modelId === AUTO_MODEL_ID) {
		if (!hasAnyProviderConfigured(settings)) {
			return 'Add an API key in Settings → AI to use the writing assistant.';
		}

		return null;
	}

	const option = resolveModelOption(modelId);

	if (!option) {
		return 'Unknown model selected.';
	}

	if (isProviderConfigured(settings as AiSettings, option.provider)) {
		return null;
	}

	const providerLabel = AI_PROVIDER_LABELS[option.provider];
	return `Add your ${providerLabel} API key in Settings → AI to use ${option.label}.`;
}

export function resolveEffectiveModel(
	modelId: string,
	settings: Pick<AiSettings, 'apiKeys' | 'ollamaBaseUrl' | 'defaultModel'>,
): { modelId: string; provider: AiProvider } {
	if (modelId !== AUTO_MODEL_ID) {
		const option = resolveModelOption(modelId);

		if (option) {
			return { modelId: option.id, provider: option.provider };
		}
	}

	const available = resolveAutoModel(settings);

	if (available) {
		return available;
	}

	const fallback = resolveModelOption(settings.defaultModel) ?? AI_MODEL_REGISTRY[0];

	return { modelId: fallback.id, provider: fallback.provider };
}

export function maskApiKey(key: string): string {
	const trimmed = key.trim();

	if (trimmed.length <= 8) {
		return '••••••••';
	}

	return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}
