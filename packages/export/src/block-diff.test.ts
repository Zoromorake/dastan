import { describe, expect, it } from 'vitest';
import { getChangedBlockIndices } from './block-diff';

describe('export block-diff', () => {
	it('detects changed block indices', () => {
		const baseline = {
			type: 'doc',
			content: [{ type: 'action', content: [{ type: 'text', text: 'Same' }] }],
		};
		const current = {
			type: 'doc',
			content: [{ type: 'action', content: [{ type: 'text', text: 'Changed' }] }],
		};

		expect(getChangedBlockIndices(current, baseline)).toEqual([0]);
	});
});
