import { describe, expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { getChangedBlockIndices } from './block-diff';
import { createRevisionSetRecord, resolveBaselineSnapshot } from './revision-mode';

const baselineContent: JSONContent = {
	type: 'doc',
	content: [
		{ type: 'action', content: [{ type: 'text', text: 'Unchanged.' }] },
		{ type: 'action', content: [{ type: 'text', text: 'Original line.' }] },
	],
};

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
		const sets = [createRevisionSetRecord('blue', 'v2')];

		expect(resolveBaselineSnapshot(versions, sets, sets[0]?.id ?? null)?.id).toBe('v2');
		expect(resolveBaselineSnapshot(versions, [], null)?.id).toBe('v1');
	});

	it('flags only the edited block against an active revision set baseline', () => {
		const baselineVersion = {
			id: 'baseline-v1',
			documentId: 'doc-1',
			isManual: true,
			content: baselineContent,
			savedAt: '2026-07-05T00:00:00.000Z',
			title: 'Blue revision baseline',
		};
		const revisionSet = createRevisionSetRecord('blue', baselineVersion.id);
		const resolvedBaseline = resolveBaselineSnapshot([baselineVersion], [revisionSet], revisionSet.id);

		const editedContent: JSONContent = {
			type: 'doc',
			content: [
				{ type: 'action', content: [{ type: 'text', text: 'Unchanged.' }] },
				{ type: 'action', content: [{ type: 'text', text: 'Revised line.' }] },
			],
		};

		expect(getChangedBlockIndices(editedContent, resolvedBaseline?.content ?? null)).toEqual([1]);
	});
});
