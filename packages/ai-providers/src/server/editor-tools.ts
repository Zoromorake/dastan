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
			description:
				'Insert a new scene into the screenplay at the cursor or end of script. Use when the writer asks for a new location, beat, or sequence. ' +
				'sceneHeading must follow INT./EXT. convention (e.g. INT. COFFEE SHOP - DAY). Optional action, character, and dialogue fields populate the first blocks. ' +
				'Character names are stored uppercase. The writer will see an accept/reject preview before changes apply.',
			inputSchema: insertSceneToolSchema,
		}),
		rewrite_dialogue: tool({
			description:
				'Replace dialogue for a named character. Use when polishing lines, adjusting tone, or fixing a specific speech. ' +
				'character must match an existing cue (uppercase). newDialogue is plain dialogue text without the character cue. ' +
				'Optional sceneIndex (0-based) limits the rewrite to one scene. Output is shown to the writer as an accept/reject preview.',
			inputSchema: rewriteDialogueToolSchema,
		}),
		update_beat: tool({
			description:
				'Update a card on the beat board (story development tab). Use when reorganizing story beats or capturing plot notes. ' +
				'Provide beatId when known, otherwise match by heading. beat is the new description text. ' +
				'Changes appear in the beat board after the writer accepts the preview.',
			inputSchema: updateBeatToolSchema,
		}),
		edit_character: tool({
			description:
				'Update a character profile in the World tab. Use when refining backstory, age, arc, or notes. ' +
				'name must match an existing character. Optional age, arc, and notes fields merge into the profile. ' +
				'The writer reviews changes in an accept/reject preview before they are saved.',
			inputSchema: editCharacterToolSchema,
		}),
		update_outline: tool({
			description:
				'Update a structure beat in the outline (Setup, Midpoint, etc.). Use when adjusting act structure or beat summaries. ' +
				'beatLabel identifies the beat to change; summary is the new one- or two-sentence description. ' +
				'Accepted changes update the development outline visible in workspace tabs.',
			inputSchema: updateOutlineToolSchema,
		}),
		update_notes: tool({
			description:
				'Replace or extend global notes for the script (project-wide writer notes). Use for tone guides, research links, or constraints. ' +
				'notes is the full replacement text for global notes. ' +
				'The writer sees an accept/reject preview before notes are saved.',
			inputSchema: updateNotesToolSchema,
		}),
	};
}
