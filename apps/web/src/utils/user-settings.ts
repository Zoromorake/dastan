import type { ScriptTemplate } from '../types';

export type { ScriptTemplate } from '../types';

export type UserThemeSetting = 'light' | 'dark' | 'system';

export type SettingsTab = 'profile' | 'preferences' | 'addressBook' | 'ai';

export interface UserSettingsState {
	profileImageDataUrl: string | null;
	penName: string;
	yearsWriting: number;
	projectsCompleted: number;
	autoSaveCadence: 'auto' | '30s' | '1m' | '5m';
	defaultTemplate: ScriptTemplate;
	showFormatPalette: boolean;
	trackWritingStats: boolean;
	typewriterMode: boolean;
	hubFileViewMode: 'grid' | 'list';
	aiTodayPanel: boolean;
}

export const userSettingsStorageKey = 'dastan.user-settings.v1';

export const GENERAL_CHAT_DOCUMENT_ID = '__general__';

const defaultUserSettings: UserSettingsState = {
	profileImageDataUrl: null,
	penName: 'Arif',
	yearsWriting: 0,
	projectsCompleted: 0,
	autoSaveCadence: 'auto',
	defaultTemplate: 'feature',
	showFormatPalette: true,
	trackWritingStats: true,
	typewriterMode: false,
	hubFileViewMode: 'grid',
	aiTodayPanel: false,
};

function migrateDefaultTemplate(value: unknown): ScriptTemplate {
	if (
		value === 'feature' ||
		value === 'short' ||
		value === 'tv_pilot' ||
		value === 'tv_episode' ||
		value === 'stage_play' ||
		value === 'documentary'
	) {
		return value;
	}

	if (value === 'screenplay') {
		return 'feature';
	}

	if (value === 'teleplay' || value === 'tv') {
		return 'tv_episode';
	}

	return 'feature';
}

export function loadUserSettings(): UserSettingsState {
	if (typeof window === 'undefined') {
		return defaultUserSettings;
	}

	const raw = window.localStorage.getItem(userSettingsStorageKey);

	if (!raw) {
		return defaultUserSettings;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<UserSettingsState> & { defaultTemplate?: unknown; recentItems?: unknown; about?: string };
		const { recentItems: _recentItems, about: _about, ...rest } = parsed;

		return {
			...defaultUserSettings,
			...rest,
			defaultTemplate: migrateDefaultTemplate(parsed.defaultTemplate),
			hubFileViewMode: parsed.hubFileViewMode === 'list' ? 'list' : 'grid',
		};
	} catch {
		return defaultUserSettings;
	}
}

export function saveUserSettings(settings: UserSettingsState): void {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(userSettingsStorageKey, JSON.stringify(settings));
}

export function loadDefaultTemplate(): ScriptTemplate {
	return loadUserSettings().defaultTemplate;
}

export function loadTrackWritingStats(): boolean {
	return loadUserSettings().trackWritingStats;
}

export function setTrackWritingStats(enabled: boolean): void {
	const settings = loadUserSettings();
	saveUserSettings({ ...settings, trackWritingStats: enabled });
}

export function loadTypewriterMode(): boolean {
	return loadUserSettings().typewriterMode;
}

export function setTypewriterMode(enabled: boolean): void {
	const settings = loadUserSettings();
	saveUserSettings({ ...settings, typewriterMode: enabled });

	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('dastan:typewriter-mode-changed', { detail: enabled }));
	}
}

export function loadHubFileViewMode(): 'grid' | 'list' {
	return loadUserSettings().hubFileViewMode;
}

export function setHubFileViewMode(mode: 'grid' | 'list'): void {
	const settings = loadUserSettings();
	saveUserSettings({ ...settings, hubFileViewMode: mode });
}

export function loadAiTodayPanel(): boolean {
	return loadUserSettings().aiTodayPanel;
}

export function setAiTodayPanel(enabled: boolean): void {
	const settings = loadUserSettings();
	saveUserSettings({ ...settings, aiTodayPanel: enabled });
}

export const SCRIPT_TEMPLATE_LABELS: Record<ScriptTemplate, string> = {
	feature: 'Feature film',
	short: 'Short film',
	tv_pilot: 'TV pilot',
	tv_episode: 'TV episode',
	stage_play: 'Stage play',
	documentary: 'Documentary',
};
