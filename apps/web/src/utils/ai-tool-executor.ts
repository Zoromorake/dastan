import type {
	EditCharacterInput,
	InsertSceneInput,
	RewriteDialogueInput,
	UpdateBeatInput,
	UpdateNotesInput,
	UpdateOutlineInput,
} from '@dastan/ai-providers';
import type { ScreenplayWorkspaceData } from '../types';

export interface WorkspaceEditorCommands {
	getWorkspace: () => ScreenplayWorkspaceData;
	updateWorkspace: (patch: Partial<ScreenplayWorkspaceData>) => void;
}

export interface AiToolExecutorContext extends WorkspaceEditorCommands {
	insertAtCursor: (text: string) => void;
	insertScreenplayText: (text: string) => void;
	replaceSelection: (text: string) => void;
}

function formatSceneBlock(input: InsertSceneInput): string {
	const lines = [input.sceneHeading.trim()];

	if (input.action?.trim()) {
		lines.push('', input.action.trim());
	}

	if (input.character?.trim() && input.dialogue?.trim()) {
		lines.push('', input.character.trim().toUpperCase(), input.dialogue.trim());
	} else if (input.dialogue?.trim()) {
		lines.push('', input.dialogue.trim());
	}

	return lines.join('\n');
}

export function executeAiTool(
	toolName: string,
	input: unknown,
	context: AiToolExecutorContext,
): { success: boolean; message: string } {
	switch (toolName) {
		case 'insert_scene': {
			const scene = input as InsertSceneInput;
			context.insertScreenplayText(formatSceneBlock(scene));
			return { success: true, message: `Inserted scene: ${scene.sceneHeading}` };
		}
		case 'rewrite_dialogue': {
			const rewrite = input as RewriteDialogueInput;
			const block = `${rewrite.character.trim().toUpperCase()}\n${rewrite.newDialogue.trim()}`;
			context.replaceSelection(block);
			return { success: true, message: `Rewrote dialogue for ${rewrite.character}` };
		}
		case 'update_beat': {
			const update = input as UpdateBeatInput;
			const workspace = context.getWorkspace();
			const beatBoard = workspace.beatBoard.map((beat) => {
				if (update.beatId && beat.id === update.beatId) {
					return { ...beat, beat: update.beat };
				}

				if (!update.beatId && update.heading && beat.heading.toLowerCase() === update.heading.toLowerCase()) {
					return { ...beat, beat: update.beat };
				}

				return beat;
			});

			context.updateWorkspace({ beatBoard });
			return { success: true, message: 'Updated beat board entry.' };
		}
		case 'edit_character': {
			const edit = input as EditCharacterInput;
			const workspace = context.getWorkspace();
			const key = edit.name.trim().toUpperCase();
			const existing = workspace.characterProfiles[key] ?? { name: edit.name.trim() };
			context.updateWorkspace({
				characterProfiles: {
					...workspace.characterProfiles,
					[key]: {
						...existing,
						name: edit.name.trim(),
						age: edit.age ?? existing.age,
						arc: edit.arc ?? existing.arc,
						notes: edit.notes ?? existing.notes,
					},
				},
			});
			return { success: true, message: `Updated character profile for ${edit.name}` };
		}
		case 'update_outline': {
			const update = input as UpdateOutlineInput;
			const workspace = context.getWorkspace();
			context.updateWorkspace({
				development: {
					...workspace.development,
					structureBeats: workspace.development.structureBeats.map((beat) =>
						beat.label.toLowerCase() === update.beatLabel.toLowerCase()
							? { ...beat, summary: update.summary }
							: beat,
					),
				},
			});
			return { success: true, message: `Updated outline beat: ${update.beatLabel}` };
		}
		case 'update_notes': {
			const update = input as UpdateNotesInput;
			context.updateWorkspace({ globalNotes: update.notes });
			return { success: true, message: 'Updated global notes.' };
		}
		case 'planner_insert': {
			const text =
				typeof input === 'object' && input && 'text' in input
					? String((input as { text: string }).text)
					: String(input ?? '');
			context.insertAtCursor(text);
			return { success: true, message: 'Inserted planner draft.' };
		}
		default:
			return { success: false, message: `Unknown tool: ${toolName}` };
	}
}

export type StreamingToolPartState =
	| 'input-streaming'
	| 'input-available'
	| 'output-available'
	| 'output-error'
	| 'approval-requested'
	| 'approval-responded'
	| 'output-denied'
	| 'unknown';

export interface ExtractedToolPart {
	toolCallId: string;
	toolName: string;
	input: unknown;
	state: StreamingToolPartState;
}

type LooseToolPart = {
	type: string;
	toolName?: string;
	toolCallId?: string;
	state?: string;
	input?: unknown;
	args?: unknown;
};

function resolveToolName(part: LooseToolPart): string | null {
	if (part.type === 'dynamic-tool' || part.type === 'tool-invocation') {
		return part.toolName?.trim() || null;
	}

	if (part.type.startsWith('tool-')) {
		return part.toolName?.trim() || part.type.slice('tool-'.length) || null;
	}

	return null;
}

function resolveToolPartState(state: string | undefined): StreamingToolPartState {
	switch (state) {
		case 'input-streaming':
		case 'input-available':
		case 'output-available':
		case 'output-error':
		case 'approval-requested':
		case 'approval-responded':
		case 'output-denied':
			return state;
		default:
			return 'unknown';
	}
}

/** Extract tool parts with stable ids and streaming state (AI SDK 5/6 UIMessage shapes). */
export function extractToolParts(message: {
	parts: Array<LooseToolPart>;
}): ExtractedToolPart[] {
	const parts: ExtractedToolPart[] = [];

	for (const [index, part] of message.parts.entries()) {
		const toolName = resolveToolName(part);

		if (!toolName) {
			continue;
		}

		parts.push({
			toolCallId: part.toolCallId?.trim() || `${toolName}-${index}`,
			toolName,
			input: part.input ?? part.args ?? {},
			state: resolveToolPartState(part.state),
		});
	}

	return parts;
}

export function extractToolInvocations(message: {
	parts: Array<LooseToolPart>;
}): Array<{ toolName: string; input: unknown; toolCallId: string }> {
	return extractToolParts(message).map((part) => ({
		toolName: part.toolName,
		input: part.input,
		toolCallId: part.toolCallId,
	}));
}
