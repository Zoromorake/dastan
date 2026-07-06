import { describe, expect, it } from 'vitest';
import {
	applySceneInsertNumbering,
	computeSceneNumberLabels,
	findInsertedSceneIndices,
	lockSceneNumbers,
} from './scene-numbering';

const threeScenes = {
	type: 'doc',
	content: [
		{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. A - DAY' }] },
		{ type: 'action', content: [{ type: 'text', text: 'One.' }] },
		{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. B - DAY' }] },
		{ type: 'action', content: [{ type: 'text', text: 'Two.' }] },
		{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. C - DAY' }] },
		{ type: 'action', content: [{ type: 'text', text: 'Three.' }] },
	],
};

describe('scene-numbering', () => {
	it('locks scene numbers by ordinal', () => {
		expect(lockSceneNumbers(threeScenes)).toEqual({ 0: '1', 1: '2', 2: '3' });
	});

	it('assigns A13 when inserting between locked 12 and 13', () => {
		const locks = { 0: '12', 1: '13' };
		const previous = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWELVE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. THIRTEEN - DAY' }] },
			],
		};
		const next = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWELVE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. NEW - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. THIRTEEN - DAY' }] },
			],
		};

		const updated = applySceneInsertNumbering(previous, next, locks);
		expect(updated[0]).toBe('12');
		expect(updated[1]).toBe('A13');
		expect(updated[2]).toBe('13');
	});

	it('assigns B13 on a second insert before scene 13', () => {
		const locks = { 0: '12', 1: 'A13', 2: '13' };
		const previous = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWELVE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. NEW A - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. THIRTEEN - DAY' }] },
			],
		};
		const next = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWELVE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. NEW B - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. NEW A - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. THIRTEEN - DAY' }] },
			],
		};

		const updated = applySceneInsertNumbering(previous, next, locks);
		expect(updated[0]).toBe('12');
		expect(updated[1]).toBe('B13');
		expect(updated[2]).toBe('A13');
		expect(updated[3]).toBe('13');
	});

	it('assigns A1 when inserting before scene 1', () => {
		const locks = { 0: '1', 1: '2' };
		const previous = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. ONE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWO - DAY' }] },
			],
		};
		const next = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. PROLOGUE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. ONE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWO - DAY' }] },
			],
		};

		const updated = applySceneInsertNumbering(previous, next, locks);
		expect(updated[0]).toBe('A1');
		expect(updated[1]).toBe('1');
		expect(updated[2]).toBe('2');
	});

	it('numbers each scene in a multi-scene paste', () => {
		const locks = { 0: '12', 1: '13' };
		const previous = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWELVE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. THIRTEEN - DAY' }] },
			],
		};
		const next = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWELVE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. PASTE A - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. PASTE B - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. THIRTEEN - DAY' }] },
			],
		};

		const updated = applySceneInsertNumbering(previous, next, locks);
		expect(updated[0]).toBe('12');
		expect(updated[1]).toBe('A13');
		expect(updated[2]).toBe('B13');
		expect(updated[3]).toBe('13');
	});

	it('assigns the next integer when appending after the last locked scene', () => {
		const locks = { 0: '12', 1: '13' };
		const previous = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWELVE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. THIRTEEN - DAY' }] },
			],
		};
		const next = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWELVE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. THIRTEEN - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. FOURTEEN - DAY' }] },
			],
		};

		const updated = applySceneInsertNumbering(previous, next, locks);
		expect(updated[0]).toBe('12');
		expect(updated[1]).toBe('13');
		expect(updated[2]).toBe('14');
	});

	it('handles delete-then-insert by realigning locks to surviving headings', () => {
		const locks = { 0: '12', 1: 'A13', 2: '13' };
		const beforeDelete = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWELVE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. A13 SCENE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. THIRTEEN - DAY' }] },
			],
		};
		const afterDelete = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWELVE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. THIRTEEN - DAY' }] },
			],
		};
		const afterInsert = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. TWELVE - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. REPLACEMENT - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. THIRTEEN - DAY' }] },
			],
		};

		const dropped = applySceneInsertNumbering(beforeDelete, afterDelete, locks);
		expect(dropped[0]).toBe('12');
		expect(dropped[1]).toBe('13');

		const replaced = applySceneInsertNumbering(afterDelete, afterInsert, dropped);
		expect(replaced[0]).toBe('12');
		expect(replaced[1]).toBe('A13');
		expect(replaced[2]).toBe('13');
	});

	it('maps labels to scene heading block indices', () => {
		const labels = computeSceneNumberLabels(threeScenes, { 0: '1', 1: '2', 2: '3' });
		expect(labels.get(0)).toBe('1');
		expect(labels.get(2)).toBe('2');
		expect(labels.get(4)).toBe('3');
	});

	it('finds multiple inserted scene indices in one diff', () => {
		const previous = {
			type: 'doc',
			content: [{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. A - DAY' }] }],
		};
		const next = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. B - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. C - DAY' }] },
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. A - DAY' }] },
			],
		};

		expect(findInsertedSceneIndices(previous, next)).toEqual([0, 1]);
	});
});
