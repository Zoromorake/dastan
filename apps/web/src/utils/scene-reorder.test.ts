import { describe, expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { getSceneIndexForBlockIndex, moveSceneInContent, splitContentIntoSceneGroups } from './scene-reorder';

const sampleContent: JSONContent = {
	type: 'doc',
	content: [
		{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. KITCHEN - DAY' }] },
		{ type: 'action', content: [{ type: 'text', text: 'First scene action.' }] },
		{ type: 'scene_heading', content: [{ type: 'text', text: 'EXT. STREET - NIGHT' }] },
		{ type: 'action', content: [{ type: 'text', text: 'Second scene action.' }] },
	],
};

describe('scene-reorder', () => {
	it('splits screenplay content into scene groups', () => {
		expect(splitContentIntoSceneGroups(sampleContent)).toHaveLength(2);
	});

	it('maps block index to scene index', () => {
		expect(getSceneIndexForBlockIndex(sampleContent, 0)).toBe(0);
		expect(getSceneIndexForBlockIndex(sampleContent, 2)).toBe(1);
	});

	it('swaps adjacent scenes', () => {
		const moved = moveSceneInContent(sampleContent, 1, 'up');
		const groups = splitContentIntoSceneGroups(moved ?? sampleContent);

		expect(groups[0]?.[0]).toMatchObject({ type: 'scene_heading', content: [{ type: 'text', text: 'EXT. STREET - NIGHT' }] });
		expect(groups[1]?.[0]).toMatchObject({ type: 'scene_heading', content: [{ type: 'text', text: 'INT. KITCHEN - DAY' }] });
	});

	it('returns null when move is out of range', () => {
		expect(moveSceneInContent(sampleContent, 0, 'up')).toBeNull();
		expect(moveSceneInContent(sampleContent, 1, 'down')).toBeNull();
	});
});
