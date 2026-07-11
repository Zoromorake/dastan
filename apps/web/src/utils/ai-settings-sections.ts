export type AiSettingsSection = 'providers' | 'models' | 'behavior' | 'memory' | 'today-panel';

export const AI_SETTINGS_SECTION_IDS: Record<AiSettingsSection, string> = {
	providers: 'ai-providers',
	models: 'ai-models',
	behavior: 'ai-behavior',
	memory: 'ai-memory',
	'today-panel': 'ai-today-panel',
};

export function aiSettingsSectionHash(section: AiSettingsSection): string {
	return `#${AI_SETTINGS_SECTION_IDS[section]}`;
}
