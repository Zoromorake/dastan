import { describe, expect, it } from 'vitest';
import { createRevisionSetRecord, resolveBaselineSnapshot } from './revision-mode';

describe('revision-mode', () => {
	it('prefers active revision set baseline over manual checkpoint', () => {
		const versions = [
			{
				id: 'v1',
				documentId: 'doc',
				isManual: true,
				content: { type: 'doc', content: [] },
				savedAt: '2026-01-01',
				title: 'A',
			},
			{
				id: 'v2',
				documentId: 'doc',
				isManual: false,
				content: { type: 'doc', content: [] },
				savedAt: '2026-01-02',
				title: 'B',
			},
		];
		const sets = [
			createRevisionSetRecord('blue', 'v2', []),
		];

		expect(resolveBaselineSnapshot(versions, sets, sets[0]?.id ?? null)?.id).toBe('v2');
		expect(resolveBaselineSnapshot(versions, [], null)?.id).toBe('v1');
	});
});
