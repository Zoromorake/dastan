import { describe, expect, it } from 'vitest';
import type { ScreenplayDocumentRecord } from '../types';
import { createDefaultWorkspaceData } from '../types';
import { DEFAULT_SCRATCH_CONTENT, UNTITLED_SCREENPLAY_TITLE } from './scratch-template';
import { isBlankDraft, isSweepableBlankDraft } from './is-blank-draft';

function makeDocument(overrides: Partial<ScreenplayDocumentRecord> = {}): ScreenplayDocumentRecord {
	const now = new Date().toISOString();

	return {
		id: 'doc-1',
		title: UNTITLED_SCREENPLAY_TITLE,
		createdAt: now,
		updatedAt: now,
		content: DEFAULT_SCRATCH_CONTENT,
		workspace: createDefaultWorkspaceData(),
		...overrides,
	};
}

describe('isBlankDraft', () => {
	it('treats untouched scratch scripts as blank', () => {
		expect(isBlankDraft(makeDocument())).toBe(true);
	});

	it('disqualifies when content differs from the template', () => {
		const document = makeDocument({
			content: {
				type: 'doc',
				content: [
					...DEFAULT_SCRATCH_CONTENT.content!,
					{ type: 'action', content: [{ type: 'text', text: 'New line.' }] },
				],
			},
		});

		expect(isBlankDraft(document)).toBe(false);
	});

	it('disqualifies when workspace has a logline', () => {
		const workspace = createDefaultWorkspaceData();
		workspace.development.basics.logline = 'A writer fights a deadline.';

		expect(isBlankDraft(makeDocument({ workspace }))).toBe(false);
	});

	it('disqualifies renamed scripts even with default content', () => {
		expect(isBlankDraft(makeDocument({ title: 'LUNAR' }))).toBe(false);
	});
});

describe('isSweepableBlankDraft', () => {
	it('requires 48 hours untouched', () => {
		const old = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
		expect(isSweepableBlankDraft(makeDocument({ updatedAt: old }))).toBe(true);
		expect(isSweepableBlankDraft(makeDocument())).toBe(false);
	});
});
