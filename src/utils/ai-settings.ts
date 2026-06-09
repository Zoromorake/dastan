export type AiProvider = 'openai' | 'anthropic' | 'google' | 'openrouter';

export interface AiSettings {
	defaultProvider: AiProvider;
	defaultModel: string;
	apiKeys: Partial<Record<AiProvider, string>>;
	globalRules: string;
	includeScriptContext: boolean;
	includeWorkspaceContext: boolean;
	chatApiUrl: string;
}

const aiSettingsStorageKey = 'dastan.ai-settings.v1';

export const defaultAiSettings: AiSettings = {
	defaultProvider: 'anthropic',
	defaultModel: 'claude-sonnet-4-20250514',
	apiKeys: {},
	globalRules: '',
	includeScriptContext: true,
	includeWorkspaceContext: true,
	chatApiUrl: import.meta.env.VITE_AI_CHAT_URL ?? '/api/chat',
};

export function loadAiSettings(): AiSettings {
	if (typeof window === 'undefined') {
		return defaultAiSettings;
	}

	const raw = window.localStorage.getItem(aiSettingsStorageKey);

	if (!raw) {
		return defaultAiSettings;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<AiSettings>;
		return {
			...defaultAiSettings,
			...parsed,
			apiKeys: {
				...defaultAiSettings.apiKeys,
				...parsed.apiKeys,
			},
		};
	} catch {
		return defaultAiSettings;
	}
}

export function saveAiSettings(settings: AiSettings): void {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(aiSettingsStorageKey, JSON.stringify(settings));
}

export function getApiKeyForProvider(settings: AiSettings, provider: AiProvider): string | undefined {
	const key = settings.apiKeys[provider];
	return typeof key === 'string' && key.trim().length > 0 ? key.trim() : undefined;
}
