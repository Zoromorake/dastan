import type { AiSettings } from '@dastan/ai-providers';

export interface AiChatParams {
	messages: unknown[];
	provider: string;
	model: string;
	system: string;
	apiKey?: string;
}

export interface AiProviderAdapter {
	id: string;
	label: string;
	requiresApiKey: boolean;
	supportsStreaming: boolean;
	resolveApiKey(settings: AiSettings): string | undefined;
	resolveChatApiUrl(settings: AiSettings): string;
}

export interface AiProviderRegistry {
	register(provider: AiProviderAdapter): void;
	get(id: string): AiProviderAdapter | undefined;
	list(): AiProviderAdapter[];
}

export function createAiProviderRegistry(initialProviders: AiProviderAdapter[] = []): AiProviderRegistry {
	const providers = new Map<string, AiProviderAdapter>();

	for (const provider of initialProviders) {
		providers.set(provider.id, provider);
	}

	return {
		register(provider) {
			providers.set(provider.id, provider);
		},
		get(id) {
			return providers.get(id);
		},
		list() {
			return [...providers.values()];
		},
	};
}
