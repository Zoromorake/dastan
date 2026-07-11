import type { JSONContent } from '@tiptap/core';

/** Default content for a new blank script — must stay in sync with local-storage defaultContent. */
export const DEFAULT_SCRATCH_CONTENT: JSONContent = {
	type: 'doc',
	content: [
		{
			type: 'transition',
			content: [{ type: 'text', text: 'FADE IN:' }],
		},
		{
			type: 'scene_heading',
			content: [{ type: 'text', text: 'INT. APARTMENT - DAY' }],
		},
		{
			type: 'action',
			content: [
				{
					type: 'text',
					text: 'Morning light fills a quiet room. A writer opens a fresh script and begins.',
				},
			],
		},
	],
};

export const UNTITLED_SCREENPLAY_TITLE = 'Untitled Screenplay';

export function isDefaultScratchContent(content: JSONContent | null | undefined): boolean {
	if (!content) {
		return true;
	}

	return JSON.stringify(content) === JSON.stringify(DEFAULT_SCRATCH_CONTENT);
}

export function createFreshFadeInContent(): JSONContent {
	return {
		type: 'doc',
		content: [
			{
				type: 'transition',
				content: [{ type: 'text', text: 'FADE IN:' }],
			},
		],
	};
}
