import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { ScreenplayBlockType } from '@dastan/screenplay-model';
import { getCurrentBlockIndex, getEditorBlockType } from './commands';

export type DualDialogueSide = 'left' | 'right';

const DUAL_SEQUENCE: ScreenplayBlockType[] = ['character', 'dialogue', 'character', 'dialogue'];

function blockSideForOffset(offset: number): DualDialogueSide {
	return offset < 2 ? 'left' : 'right';
}

function nodeSide(node: ProseMirrorNode): DualDialogueSide | null {
	const side = node.attrs.dualDialogueSide;
	return side === 'left' || side === 'right' ? side : null;
}

function isDualGroupStart(doc: ProseMirrorNode, index: number): boolean {
	if (index + 3 >= doc.childCount) {
		return false;
	}

	for (let offset = 0; offset < 4; offset += 1) {
		if (doc.child(index + offset).type.name !== DUAL_SEQUENCE[offset]) {
			return false;
		}
	}

	return true;
}

export function findDualDialogueGroupStart(doc: ProseMirrorNode, index: number): number | null {
	const node = doc.child(index);
	const side = nodeSide(node);

	if (side) {
		if (node.type.name === 'character') {
			return side === 'right' ? index - 2 : index;
		}

		if (node.type.name === 'dialogue') {
			const previous = doc.child(index - 1);
			return nodeSide(previous) === 'right' ? index - 3 : index - 1;
		}
	}

	if (node.type.name === 'character') {
		return index;
	}

	if (node.type.name === 'dialogue') {
		const previous = doc.child(index - 1);
		return previous?.type.name === 'character' ? index - 1 : null;
	}

	return null;
}

function dualGroupIsActive(doc: ProseMirrorNode, startIndex: number): boolean {
	if (!isDualGroupStart(doc, startIndex)) {
		return false;
	}

	return DUAL_SEQUENCE.some((_, offset) => nodeSide(doc.child(startIndex + offset)) !== null);
}

function getBlockInsertPos(doc: ProseMirrorNode, index: number): number {
	let pos = 0;

	for (let childIndex = 0; childIndex <= index; childIndex += 1) {
		pos += doc.child(childIndex).nodeSize;
	}

	return pos;
}

function ensureDualDialogueGroup(editor: Editor, startIndex: number): number | null {
	const doc = editor.state.doc;

	if (isDualGroupStart(doc, startIndex)) {
		return startIndex;
	}

	if (startIndex + 1 >= doc.childCount) {
		return null;
	}

	if (doc.child(startIndex).type.name !== 'character' || doc.child(startIndex + 1).type.name !== 'dialogue') {
		return null;
	}

	const insertPos = getBlockInsertPos(doc, startIndex + 1);
	const inserted = editor
		.chain()
		.focus()
		.insertContentAt(insertPos, [{ type: 'character' }, { type: 'dialogue' }])
		.run();

	if (!inserted) {
		return null;
	}

	return startIndex;
}

export function toggleDualDialogue(editor: Editor): boolean {
	const blockType = getEditorBlockType(editor);

	if (blockType !== 'character' && blockType !== 'dialogue') {
		return false;
	}

	const index = getCurrentBlockIndex(editor);
	const initialGroupStart = findDualDialogueGroupStart(editor.state.doc, index);

	if (initialGroupStart === null) {
		return false;
	}

	const groupStart = ensureDualDialogueGroup(editor, initialGroupStart) ?? initialGroupStart;

	if (!isDualGroupStart(editor.state.doc, groupStart)) {
		return false;
	}

	const shouldDisable = dualGroupIsActive(editor.state.doc, groupStart);

	editor.chain().focus().command(({ tr, state }) => {
		let pos = 0;

		for (let childIndex = 0; childIndex < groupStart; childIndex += 1) {
			pos += state.doc.child(childIndex).nodeSize;
		}

		for (let offset = 0; offset < 4; offset += 1) {
			const node = state.doc.child(groupStart + offset);
			tr.setNodeMarkup(pos, undefined, {
				...node.attrs,
				dualDialogueSide: shouldDisable ? null : blockSideForOffset(offset),
			});
			pos += node.nodeSize;
		}

		return true;
	}).run();

	requestAnimationFrame(() => {
		alignDualDialogueColumns(editor.view.dom);
	});

	return true;
}

export function isDualDialogueActive(editor: Editor): boolean {
	const blockType = getEditorBlockType(editor);

	if (blockType !== 'character' && blockType !== 'dialogue') {
		return false;
	}

	const index = getCurrentBlockIndex(editor);
	const groupStart = findDualDialogueGroupStart(editor.state.doc, index);

	if (groupStart === null) {
		return false;
	}

	return dualGroupIsActive(editor.state.doc, groupStart);
}

export function alignDualDialogueColumns(root: ParentNode): void {
	const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-block-type]'));

	blocks.forEach((block) => {
		block.style.marginTop = '';
	});

	for (let index = 0; index < blocks.length; index += 1) {
		const leftCharacter = blocks[index];

		if (
			leftCharacter.getAttribute('data-block-type') !== 'character' ||
			leftCharacter.getAttribute('data-dual-dialogue-side') !== 'left'
		) {
			continue;
		}

		const leftDialogue = blocks[index + 1];
		const rightCharacter = blocks[index + 2];
		const rightDialogue = blocks[index + 3];

		if (
			leftDialogue?.getAttribute('data-dual-dialogue-side') !== 'left' ||
			rightCharacter?.getAttribute('data-dual-dialogue-side') !== 'right' ||
			rightDialogue?.getAttribute('data-dual-dialogue-side') !== 'right'
		) {
			continue;
		}

		rightCharacter.style.marginTop = `-${leftCharacter.offsetHeight}px`;
		rightDialogue.style.marginTop = `-${leftDialogue.offsetHeight}px`;
		index += 3;
	}
}
