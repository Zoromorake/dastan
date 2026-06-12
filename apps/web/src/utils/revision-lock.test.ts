import { describe, expect, it } from 'vitest';
import { getBlockPageNumber, isBlockRevisionLocked } from './revision-lock';

const sampleContent = {
	type: 'doc',
	content: Array.from({ length: 80 }, (_, index) => ({
		type: 'action',
		content: [{ type: 'text', text: `Line ${index + 1} with enough text to consume pagination budget.` }],
	})),
};

describe('revision lock', () => {
	it('assigns later blocks to higher page numbers', () => {
		expect(getBlockPageNumber(0, sampleContent)).toBe(1);
		expect(getBlockPageNumber(70, sampleContent)).toBeGreaterThan(1);
	});

	it('locks blocks on pages within the locked range', () => {
		expect(isBlockRevisionLocked(0, sampleContent, 1, true)).toBe(true);
		expect(isBlockRevisionLocked(70, sampleContent, 1, true)).toBe(false);
		expect(isBlockRevisionLocked(0, sampleContent, 1, false)).toBe(false);
	});
});
