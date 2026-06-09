import type { Editor } from '@tiptap/react';
import { isScreenplayBlockType, SCREENPLAY_BLOCK_TYPES, type ScreenplayBlockType } from '../types';

export const screenplayBlockTypes: ScreenplayBlockType[] = SCREENPLAY_BLOCK_TYPES;

export function setBlockType(editor: Editor, blockType: ScreenplayBlockType): boolean {
	return editor.chain().focus().setNode(blockType).run();
}

export function splitToBlockType(editor: Editor, blockType: ScreenplayBlockType): boolean {
	return editor.chain().focus().splitBlock().setNode(blockType).run();
}

export function isBlockShortcut(key: string): key is '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0' {
	return key === '1' || key === '2' || key === '3' || key === '4' || key === '5' || key === '6' || key === '7' || key === '8' || key === '9' || key === '0';
}

export function blockTypeForShortcut(key: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0'): ScreenplayBlockType {
	switch (key) {
		case '1':
			return 'scene_heading';
		case '2':
			return 'action';
		case '3':
			return 'character';
		case '4':
			return 'dialogue';
		case '5':
			return 'parenthetical';
		case '6':
			return 'transition';
		case '7':
			return 'centered';
		case '8':
			return 'shot';
		case '9':
			return 'general';
		case '0':
			return 'lyrics';
	}
}

export function getEditorBlockType(editor: Editor): ScreenplayBlockType | null {
	const blockType = editor.state.selection.$from.parent.type.name;
	return isScreenplayBlockType(blockType) ? blockType : null;
}

export function getCurrentBlockIndex(editor: Editor): number {
	return editor.state.selection.$from.index(0);
}

export function getCurrentBlockText(editor: Editor): string {
	return editor.state.selection.$from.parent.textContent;
}

export function replaceCurrentBlockText(editor: Editor, nextText: string, cursorOffset = nextText.length): boolean {
	const { $from } = editor.state.selection;
	const from = $from.start();
	const to = $from.end();

	return editor
		.chain()
		.focus()
		.insertContentAt({ from, to }, nextText)
		.setTextSelection(from + cursorOffset)
		.run();
}

export function toggleDualDialogue(editor: Editor): boolean {
	const blockType = getEditorBlockType(editor);

	if (blockType !== 'character' && blockType !== 'dialogue') {
		return false;
	}

	const currentValue = Boolean(editor.state.selection.$from.parent.attrs.dualDialogue);

	return editor.chain().focus().updateAttributes(blockType, { dualDialogue: !currentValue }).run();
}

export function isDualDialogueActive(editor: Editor): boolean {
	const blockType = getEditorBlockType(editor);

	if (blockType !== 'character' && blockType !== 'dialogue') {
		return false;
	}

	return Boolean(editor.state.selection.$from.parent.attrs.dualDialogue);
}
