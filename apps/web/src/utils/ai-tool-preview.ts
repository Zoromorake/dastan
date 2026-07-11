import type {
	EditCharacterInput,
	InsertSceneInput,
	RewriteDialogueInput,
	UpdateBeatInput,
	UpdateNotesInput,
	UpdateOutlineInput,
} from '@dastan/ai-providers';

export interface ToolInvocationPreview {
	toolName: string;
	input: unknown;
	summary: string;
	mutatesScript: boolean;
}

const SCRIPT_MUTATION_TOOLS = new Set(['insert_scene', 'rewrite_dialogue', 'planner_insert']);

export function formatToolPreview(toolName: string, input: unknown): ToolInvocationPreview {
	switch (toolName) {
		case 'insert_scene': {
			const scene = input as InsertSceneInput;
			const lines = [scene.sceneHeading?.trim() || '(scene heading)'];

			if (scene.action?.trim()) {
				lines.push(scene.action.trim());
			}

			if (scene.character?.trim() && scene.dialogue?.trim()) {
				lines.push(`${scene.character.trim().toUpperCase()}`, scene.dialogue.trim());
			}

			return {
				toolName,
				input,
				summary: lines.join('\n'),
				mutatesScript: true,
			};
		}
		case 'rewrite_dialogue': {
			const rewrite = input as RewriteDialogueInput;
			return {
				toolName,
				input,
				summary: `${rewrite.character?.trim().toUpperCase() || 'CHARACTER'}\n${rewrite.newDialogue?.trim() || ''}`,
				mutatesScript: true,
			};
		}
		case 'update_beat': {
			const update = input as UpdateBeatInput;
			return {
				toolName,
				input,
				summary: `Update beat: ${update.heading || update.beatId || 'beat'}\n${update.beat?.trim() || ''}`,
				mutatesScript: false,
			};
		}
		case 'edit_character': {
			const edit = input as EditCharacterInput;
			return {
				toolName,
				input,
				summary: `Edit character: ${edit.name?.trim() || 'character'}`,
				mutatesScript: false,
			};
		}
		case 'update_outline': {
			const update = input as UpdateOutlineInput;
			return {
				toolName,
				input,
				summary: `Update outline — ${update.beatLabel}: ${update.summary?.trim() || ''}`,
				mutatesScript: false,
			};
		}
		case 'update_notes': {
			const update = input as UpdateNotesInput;
			return {
				toolName,
				input,
				summary: update.notes?.trim() || 'Update global notes',
				mutatesScript: false,
			};
		}
		case 'planner_insert': {
			const text =
				typeof input === 'object' && input && 'text' in input
					? String((input as { text: string }).text)
					: String(input ?? '');
			return {
				toolName,
				input,
				summary: text.slice(0, 2000),
				mutatesScript: true,
			};
		}
		default:
			return {
				toolName,
				input,
				summary: toolName,
				mutatesScript: false,
			};
	}
}

export function isScriptMutationTool(toolName: string): boolean {
	return SCRIPT_MUTATION_TOOLS.has(toolName);
}

/** Human-readable title for tool activity cards */
export function getToolHumanTitle(toolName: string, input: unknown): string {
	switch (toolName) {
		case 'insert_scene': {
			const scene = input as InsertSceneInput;
			const heading = scene.sceneHeading?.trim() || 'new scene';
			return `Inserting scene — ${heading}`;
		}
		case 'rewrite_dialogue': {
			const rewrite = input as RewriteDialogueInput;
			const character = rewrite.character?.trim().toUpperCase() || 'dialogue';
			return `Rewriting dialogue — ${character}`;
		}
		case 'update_beat': {
			const update = input as UpdateBeatInput;
			return `Updating beat — ${update.heading || update.beatId || 'beat'}`;
		}
		case 'edit_character': {
			const edit = input as EditCharacterInput;
			return `Editing character — ${edit.name?.trim() || 'character'}`;
		}
		case 'update_outline': {
			const update = input as UpdateOutlineInput;
			return `Updating outline — ${update.beatLabel}`;
		}
		case 'update_notes':
			return 'Updating global notes';
		case 'planner_insert':
			return 'Insert script draft';
		default:
			return toolName.replace(/_/g, ' ');
	}
}

export type ToolPreviewStatus = 'running' | 'preview' | 'accepted' | 'rejected' | 'failed' | 'skipped';

export interface ToolPreviewState extends ToolInvocationPreview {
	id: string;
	status: ToolPreviewStatus;
	snapshotId?: string;
}
