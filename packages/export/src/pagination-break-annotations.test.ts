import { describe, expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { createDefaultDocumentLayout } from '@dastan/screenplay-model/layout';
import { computePaginationBreakAnnotations } from './pagination-break-annotations';

function buildPageCrossingDialogueContent(): JSONContent {
	const fillerLines = Array.from({ length: 22 }, () => ({
		type: 'action',
		content: [{ type: 'text', text: 'X'.repeat(62) }],
	}));

	return {
		type: 'doc',
		content: [
			{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. ROOM - DAY' }] },
			...fillerLines,
			{ type: 'character', content: [{ type: 'text', text: 'ALEX' }] },
			{
				type: 'dialogue',
				content: [{ type: 'text', text: 'Y'.repeat(900) }],
			},
		],
	};
}

describe('computePaginationBreakAnnotations', () => {
	it('adds MORE annotations when dialogue breaks are enabled', () => {
		const content = buildPageCrossingDialogueContent();
		const layout = createDefaultDocumentLayout();

		const enabled = computePaginationBreakAnnotations(
			content,
			layout.dialogueBreaks,
			layout.sceneBreaks,
		);
		const disabled = computePaginationBreakAnnotations(
			content,
			{ ...layout.dialogueBreaks, showMoreAtPageBottom: false, showContinuedAtPageTop: false },
			layout.sceneBreaks,
		);

		expect(enabled.some((entry) => entry.kind === 'more')).toBe(true);
		expect(disabled.some((entry) => entry.kind === 'more')).toBe(false);
		expect(enabled.length).toBeGreaterThan(disabled.length);
	});
});
