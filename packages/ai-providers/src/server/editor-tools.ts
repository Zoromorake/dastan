import { tool } from 'ai';
import {
	editCharacterToolSchema,
	insertSceneToolSchema,
	rewriteDialogueToolSchema,
	updateBeatToolSchema,
	updateNotesToolSchema,
	updateOutlineToolSchema,
} from '../ai-tools';

export function createEditorAiTools() {
	return {
		insert_scene: tool({
			description: 'Insert a new properly-typed scene into the screenplay.',
			inputSchema: insertSceneToolSchema,
		}),
		rewrite_dialogue: tool({
			description: 'Rewrite dialogue for a specific character in the screenplay.',
			inputSchema: rewriteDialogueToolSchema,
		}),
		update_beat: tool({
			description: 'Update a beat on the beat board.',
			inputSchema: updateBeatToolSchema,
		}),
		edit_character: tool({
			description: 'Update a character profile in the World tab.',
			inputSchema: editCharacterToolSchema,
		}),
		update_outline: tool({
			description: 'Update a structure beat in the outline.',
			inputSchema: updateOutlineToolSchema,
		}),
		update_notes: tool({
			description: 'Update global notes for the script.',
			inputSchema: updateNotesToolSchema,
		}),
	};
}
