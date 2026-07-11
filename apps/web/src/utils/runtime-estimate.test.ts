import { describe, expect, it } from 'vitest';
import { formatPageCount, estimateRuntimeMinutes } from './runtime-estimate';

describe('runtime-estimate', () => {
	it('formats page counts for display', () => {
		expect(formatPageCount(0)).toBe('0 pages');
		expect(formatPageCount(1)).toBe('1 page');
		expect(formatPageCount(12)).toBe('12 pages');
	});

	it('keeps runtime estimate helper for internal use', () => {
		expect(estimateRuntimeMinutes(90)).toBe(90);
		expect(estimateRuntimeMinutes(0)).toBe(1);
	});
});
