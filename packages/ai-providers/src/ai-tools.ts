import { z } from 'zod';

export const insertSceneToolSchema = z.object({
	sceneHeading: z.string().describe('Scene heading, e.g. INT. COFFEE SHOP - DAY'),
	action: z.string().optional().describe('Action/description block text'),
	character: z.string().optional().describe('Character name for dialogue'),
	dialogue: z.string().optional().describe('Dialogue line'),
});

export const rewriteDialogueToolSchema = z.object({
	character: z.string().describe('Character whose dialogue to rewrite'),
	newDialogue: z.string().describe('Replacement dialogue text'),
	sceneIndex: z.number().optional().describe('0-based scene index to target'),
});

export const updateBeatToolSchema = z.object({
	beatId: z.string().optional().describe('Beat board card ID if known'),
	heading: z.string().optional().describe('Beat heading to match if ID unknown'),
	beat: z.string().describe('Updated beat description'),
});

export const editCharacterToolSchema = z.object({
	name: z.string().describe('Character name'),
	age: z.string().optional(),
	arc: z.string().optional(),
	notes: z.string().optional(),
});

export const updateOutlineToolSchema = z.object({
	beatLabel: z.string().describe('Structure beat label to update'),
	summary: z.string().describe('Updated beat summary'),
});

export const updateNotesToolSchema = z.object({
	notes: z.string().describe('Updated global notes text'),
});

export type InsertSceneInput = z.infer<typeof insertSceneToolSchema>;
export type RewriteDialogueInput = z.infer<typeof rewriteDialogueToolSchema>;
export type UpdateBeatInput = z.infer<typeof updateBeatToolSchema>;
export type EditCharacterInput = z.infer<typeof editCharacterToolSchema>;
export type UpdateOutlineInput = z.infer<typeof updateOutlineToolSchema>;
export type UpdateNotesInput = z.infer<typeof updateNotesToolSchema>;

export const EDITOR_AI_TOOL_NAMES = [
	'insert_scene',
	'rewrite_dialogue',
	'update_beat',
	'edit_character',
	'update_outline',
	'update_notes',
] as const;

export type EditorAiToolName = (typeof EDITOR_AI_TOOL_NAMES)[number];
