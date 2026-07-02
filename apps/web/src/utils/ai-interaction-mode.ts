export type AiInteractionMode = 'ask' | 'writer';

const INTERACTION_MODE_STORAGE_KEY = 'dastan.ai-interaction-mode';

export function loadInteractionMode(defaultMode: AiInteractionMode = 'writer'): AiInteractionMode {
	if (typeof window === 'undefined') {
		return defaultMode;
	}

	const stored = window.localStorage.getItem(INTERACTION_MODE_STORAGE_KEY);

	if (stored === 'ask' || stored === 'writer') {
		return stored;
	}

	return defaultMode;
}

export function saveInteractionMode(mode: AiInteractionMode): void {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(INTERACTION_MODE_STORAGE_KEY, mode);
}

export function getInteractionModeInstructions(mode: AiInteractionMode): string {
	if (mode === 'ask') {
		return [
			'Mode: Ask (read-only advisory).',
			'Answer questions, explain choices, and analyze the screenplay.',
			'Do not propose direct script edits, rewrites, or replacement text meant to be pasted into the script.',
			'Do not output full scene rewrites unless the user explicitly asks for a short illustrative example.',
			'Focus on feedback, structure notes, creative direction, and teaching.',
		].join('\n');
	}

	return [
		'Mode: Writer (editing assistant).',
		'You may propose concrete rewrites, dialogue alternatives, and scene edits.',
		'Format screenplay suggestions in standard industry format when appropriate.',
		'When the user has highlighted text, tailor rewrites to that selection.',
		'The user can insert your suggestions directly into their script — keep rewrites paste-ready.',
	].join('\n');
}
