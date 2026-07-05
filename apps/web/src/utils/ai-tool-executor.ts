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
		default:
			return { success: false, message: `Unknown tool: ${toolName}` };
	}
}

export function extractToolInvocations(message: {
	parts: Array<{ type: string; toolName?: string; input?: unknown; args?: unknown }>;
}): Array<{ toolName: string; input: unknown }> {
	const invocations: Array<{ toolName: string; input: unknown }> = [];

	for (const part of message.parts) {
		if (part.type === 'tool-invocation' && part.toolName) {
			invocations.push({
				toolName: part.toolName,
				input: part.input ?? part.args ?? {},
			});
			continue;
		}

		if (part.type.startsWith('tool-') && 'toolName' in part && part.toolName) {
			invocations.push({
				toolName: part.toolName,
				input: part.input ?? part.args ?? {},
			});
		}
	}

	return invocations;
}
