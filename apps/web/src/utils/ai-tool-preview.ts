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

const TERMINAL_PREVIEW_STATUSES = new Set<ToolPreviewStatus>(['accepted', 'rejected', 'failed', 'skipped']);

/** Map AI SDK tool-part state → card status. Client tools are "prepared", not applied. */
export function mapToolPartStateToPreviewStatus(
	state: string,
	options?: { streamActive?: boolean },
): ToolPreviewStatus {
	const streamActive = options?.streamActive ?? false;

	switch (state) {
		case 'input-streaming':
			return 'running';
		case 'output-error':
		case 'output-denied':
			return 'failed';
		case 'input-available':
		case 'output-available':
		case 'approval-requested':
		case 'approval-responded':
			return 'preview';
		case 'unknown':
		default:
			return streamActive ? 'running' : 'preview';
	}
}

export function buildToolActivityLabel(previews: ToolPreviewState[]): string | null {
	if (previews.length === 0) {
		return null;
	}

	const running = previews.filter((item) => item.status === 'running').length;
	const ready = previews.filter((item) => item.status === 'preview').length;
	const total = previews.length;

	if (running > 0) {
		const prepared = ready;
		const current = Math.min(prepared + 1, total);
		return total === 1
			? 'Preparing edit…'
			: `Preparing edit ${current} of ${total}…`;
	}

	if (ready > 0 && ready === total) {
		return total === 1 ? '1 edit prepared' : `${total} of ${total} edits prepared`;
	}

	if (ready > 0) {
		return `${ready} of ${total} edits prepared`;
	}

	return null;
}

/** Merge live tool parts into existing previews without clobbering accept/reject decisions. */
export function mergeLiveToolPreviews(
	existing: ToolPreviewState[] | undefined,
	incoming: ToolPreviewState[],
): ToolPreviewState[] {
	const previousById = new Map((existing ?? []).map((item) => [item.id, item]));

	return incoming.map((item) => {
		const previous = previousById.get(item.id);

		if (previous && TERMINAL_PREVIEW_STATUSES.has(previous.status)) {
			return previous;
		}

		return item;
	});
}

export function markRunningToolsSkipped(previews: ToolPreviewState[]): ToolPreviewState[] {
	return previews.map((item) =>
		item.status === 'running' ? { ...item, status: 'skipped' as const } : item,
	);
}
