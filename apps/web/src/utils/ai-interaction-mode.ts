export type AiInteractionMode = 'ask' | 'planner' | 'editor';

/** @deprecated Use 'planner' instead */
export type LegacyAiInteractionMode = 'ask' | 'writer';

const INTERACTION_MODE_STORAGE_KEY = 'dastan.ai-interaction-mode';

export function normalizeInteractionMode(mode: string | null | undefined, defaultMode: AiInteractionMode = 'planner'): AiInteractionMode {
	if (mode === 'ask' || mode === 'planner' || mode === 'editor') {
		return mode;
	}

	if (mode === 'writer') {
		return 'planner';
	}

	return defaultMode;
}

export function loadInteractionMode(defaultMode: AiInteractionMode = 'planner'): AiInteractionMode {
	if (typeof window === 'undefined') {
		return defaultMode;
	}

	return normalizeInteractionMode(window.localStorage.getItem(INTERACTION_MODE_STORAGE_KEY), defaultMode);
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
			'Answer questions, explain choices, and analyze the screenplay, outline, beats, characters, and notes.',
			'Do not propose direct edits or replacement text meant to be pasted into the script or workspace.',
			'Focus on feedback, structure notes, creative direction, and teaching.',
		].join('\n');
	}

	if (mode === 'planner') {
		return [
			'Mode: Planner (structured proposals).',
			'You may read and reason over the script, outline, beat board, characters, locations, and notes.',
			'Propose concrete changes as structured suggestions the user can review and apply.',
			'Format screenplay suggestions in standard industry format when appropriate.',
			'When the user has highlighted text, tailor proposals to that selection.',
			'Do not assume changes are applied automatically — the user approves each proposal.',
		].join('\n');
	}

	return [
		'Mode: Editor (agentic editing).',
		'You have tools to directly edit the script, outline, beat board, characters, and notes.',
		'Use tools when the user asks you to make changes. Prefer typed screenplay blocks over raw text.',
		'When the user has highlighted text, target edits to that selection.',
		'Confirm what you changed after using a tool.',
	].join('\n');
}

export function interactionModeEnablesTools(mode: AiInteractionMode): boolean {
	return mode === 'editor';
}
