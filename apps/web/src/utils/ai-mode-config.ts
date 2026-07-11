import { MessageCircleQuestion, ListTree, Wand2, type LucideIcon } from 'lucide-react';
import type { AiInteractionMode } from './ai-interaction-mode';

export interface AiModeDefinition {
	id: AiInteractionMode;
	label: string;
	description: string;
	icon: LucideIcon;
}

export const AI_MODE_DEFINITIONS: AiModeDefinition[] = [
	{
		id: 'ask',
		label: 'Ask',
		description: 'Questions and feedback, never edits',
		icon: MessageCircleQuestion,
	},
	{
		id: 'planner',
		label: 'Planner',
		description: 'Structured proposals for beats, scenes, characters',
		icon: ListTree,
	},
	{
		id: 'editor',
		label: 'Editor',
		description: 'Makes changes you review and accept',
		icon: Wand2,
	},
];

export function getAiModeDefinition(mode: AiInteractionMode): AiModeDefinition {
	return AI_MODE_DEFINITIONS.find((entry) => entry.id === mode) ?? AI_MODE_DEFINITIONS[0]!;
}

/** Modes available for cycling via keyboard — editor included even when disabled (skipped at runtime). */
export const CYCLABLE_AI_MODES: AiInteractionMode[] = ['ask', 'planner', 'editor'];

export function cycleInteractionMode(
	current: AiInteractionMode,
	canUseEditor: boolean,
	direction: 1 | -1 = 1,
): AiInteractionMode {
	const pool = canUseEditor ? CYCLABLE_AI_MODES : CYCLABLE_AI_MODES.filter((m) => m !== 'editor');
	const index = pool.indexOf(current);
	const nextIndex = (index + direction + pool.length) % pool.length;
	return pool[nextIndex] ?? 'ask';
}
