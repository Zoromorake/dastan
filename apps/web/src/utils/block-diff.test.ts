import { describe, expect, it } from 'vitest';
import { getChangedBlockIndices } from './block-diff';

describe('getChangedBlockIndices', () => {
	it('returns indices for added and changed blocks', () => {
		const baseline = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. ROOM - DAY' }] },
				{ type: 'action', content: [{ type: 'text', text: 'Original action.' }] },
			],
		};
		const current = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. ROOM - DAY' }] },
				{ type: 'action', content: [{ type: 'text', text: 'Revised action.' }] },
				{ type: 'character', content: [{ type: 'text', text: 'ALEX' }] },
			],
		};

		expect(getChangedBlockIndices(current, baseline)).toEqual([1, 2]);
	});
});
