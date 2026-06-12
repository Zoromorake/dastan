import { Extension } from '@tiptap/core';

import { blockTypeForShortcut, isBlockShortcut, setBlockType } from '../commands';

export const ScreenplayKeymap = Extension.create({
	name: 'screenplay_keymap',

	addKeyboardShortcuts() {
		const shortcuts: Record<string, () => boolean> = {
			'Mod-1': () => setBlockType(this.editor, 'scene_heading'),
			'Mod-2': () => setBlockType(this.editor, 'action'),
			'Mod-3': () => setBlockType(this.editor, 'character'),
			'Mod-4': () => setBlockType(this.editor, 'dialogue'),
			'Mod-5': () => setBlockType(this.editor, 'parenthetical'),
			'Mod-6': () => setBlockType(this.editor, 'transition'),
			'Mod-7': () => setBlockType(this.editor, 'centered'),
			'Mod-8': () => setBlockType(this.editor, 'shot'),
			'Mod-9': () => setBlockType(this.editor, 'general'),
			'Mod-0': () => setBlockType(this.editor, 'lyrics'),
		};

		return shortcuts;
	},
});
