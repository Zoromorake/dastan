import { mergeAttributes, Node } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { setBlockType, splitToBlockType } from '../commands';

function handleTransition(editor: Editor, nextBlockType: 'action', splitCurrentBlock: boolean): boolean {
	if (splitCurrentBlock) {
		return splitToBlockType(editor, nextBlockType);
	}

	return setBlockType(editor, nextBlockType);
}

function isCurrentBlockEmpty(editor: Editor): boolean {
	return editor.state.selection.$from.parent.textContent.trim().length === 0;
}

function isCursorAtEnd(editor: Editor): boolean {
	const { $from } = editor.state.selection;
	return $from.parentOffset === $from.parent.content.size;
}

function getCurrentBlockText(editor: Editor): string {
	return editor.state.selection.$from.parent.textContent;
}

function replaceCurrentBlockText(editor: Editor, nextText: string): boolean {
	const { $from } = editor.state.selection;
	const from = $from.start();
	const to = $from.end();

	return editor
		.chain()
		.focus()
		.insertContentAt({ from, to }, nextText)
		.setTextSelection(from + nextText.length)
		.run();
}

function canonicalizeSceneHeadingPrefix(rawText: string): string | null {
	const trimmed = rawText.trim().toUpperCase();

	if (trimmed.length === 0 || /\s/u.test(trimmed)) {
		return null;
	}

	if (trimmed === 'INT' || trimmed === 'INT.') {
		return 'INT. ';
	}

	if (trimmed === 'EXT' || trimmed === 'EXT.') {
		return 'EXT. ';
	}

	if (trimmed === 'I/E' || trimmed === 'INT/EXT' || trimmed === 'INT./EXT.' || trimmed === 'INT./EXT') {
		return 'INT./EXT. ';
	}

	if (trimmed === 'E/I' || trimmed === 'EXT/INT' || trimmed === 'EXT./INT.' || trimmed === 'EXT./INT') {
		return 'EXT./INT. ';
	}

	return null;
}

export const SceneHeading = Node.create({
	name: 'scene_heading',
	group: 'block',
	content: 'inline*',
	defining: true,
	selectable: true,
	addAttributes() {
		return {
			omitted: {
				default: false,
				parseHTML: (element) => element.getAttribute('data-omitted') === 'true',
				renderHTML: (attributes) =>
					attributes.omitted ? { 'data-omitted': 'true' } : {},
			},
			lockedSceneNumber: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-locked-scene-number'),
				renderHTML: (attributes) =>
					attributes.lockedSceneNumber
						? { 'data-locked-scene-number': attributes.lockedSceneNumber }
						: {},
			},
		};
	},
	addKeyboardShortcuts() {
		return {
			Enter: () => {
				if (isCurrentBlockEmpty(this.editor)) {
					return handleTransition(this.editor, 'action', false);
				}

				return handleTransition(this.editor, 'action', true);
			},
			Space: () => {
				if (!isCursorAtEnd(this.editor)) {
					return false;
				}

				const canonical = canonicalizeSceneHeadingPrefix(getCurrentBlockText(this.editor));

				if (!canonical) {
					return false;
				}

				return replaceCurrentBlockText(this.editor, canonical);
			},
			Tab: () => setBlockType(this.editor, 'action'),
			'Shift-Tab': () => setBlockType(this.editor, 'transition'),
		};
	},
	parseHTML() {
		return [{ tag: 'div[data-block-type="scene_heading"]' }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-block-type': 'scene_heading',
				class: 'block min-h-6 w-full uppercase tracking-[0.18em]',
			}),
			0,
		];
	},
});
