import { describe, expect, it } from 'vitest';
import { analyzeScreenplayPagination } from './screenplay-pagination';

describe('analyzeScreenplayPagination', () => {
	it('returns at least one page for empty content', () => {
		const result = analyzeScreenplayPagination({ type: 'doc', content: [] });
		expect(result.estimatedPages).toBeGreaterThanOrEqual(1);
	});

	it('estimates multiple pages for long action blocks', () => {
		const longText = 'WORD '.repeat(400);
		const content = {
			type: 'doc',
			content: Array.from({ length: 20 }, () => ({
				type: 'action',
				content: [{ type: 'text', text: longText }],
			})),
		};

		const result = analyzeScreenplayPagination(content);
		expect(result.estimatedPages).toBeGreaterThan(1);
	});
});
