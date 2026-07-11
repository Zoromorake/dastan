import type { ScreenplayDocumentRecord } from '../types';
import { isBlankDraft } from './is-blank-draft';
import { isDefaultScratchContent } from './scratch-template';
import { isBlankWorkspace } from './is-blank-draft';

export function isMeaningfulDocumentTouch(
	previous: ScreenplayDocumentRecord,
	next: Pick<ScreenplayDocumentRecord, 'title' | 'content' | 'workspace'>,
): boolean {
	if (previous.title !== next.title && next.title.trim().length > 0) {
		return true;
	}

	if (!isDefaultScratchContent(next.content)) {
		return true;
	}

	if (!isBlankWorkspace(next.workspace)) {
		return true;
	}

	return false;
}

export function shouldPersistEphemeralDocument(document: ScreenplayDocumentRecord): boolean {
	return !isBlankDraft(document) || !isBlankWorkspace(document.workspace);
}
