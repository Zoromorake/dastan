import { describe, expect, it } from 'vitest';
import { findDualDialogueGroupStart } from './dual-dialogue';

function makeDoc(children: Array<{ type: string; attrs?: Record<string, unknown> }>) {
	return {
		childCount: children.length,
		child(index: number) {
			const node = children[index];
			return {
				type: { name: node.type },
				attrs: node.attrs ?? {},
			};
		},
	};
}

describe('dual dialogue helpers', () => {
	it('finds the start of a dual dialogue group from the right character', () => {
		const doc = makeDoc([
			{ type: 'character', attrs: { dualDialogueSide: 'left' } },
			{ type: 'dialogue', attrs: { dualDialogueSide: 'left' } },
			{ type: 'character', attrs: { dualDialogueSide: 'right' } },
			{ type: 'dialogue', attrs: { dualDialogueSide: 'right' } },
		]);

		expect(findDualDialogueGroupStart(doc as never, 2)).toBe(0);
	});

	it('finds a standard character/dialogue pair', () => {
		const doc = makeDoc([
			{ type: 'action' },
			{ type: 'character' },
			{ type: 'dialogue' },
		]);

		expect(findDualDialogueGroupStart(doc as never, 2)).toBe(1);
	});
});
