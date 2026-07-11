import type { ScreenplayDocumentRecord } from '../types';
import { isBlankDraft } from './is-blank-draft';
import { UNTITLED_SCREENPLAY_TITLE } from './scratch-template';

export function findReusableUntitledBlank(
	documents: ScreenplayDocumentRecord[],
): ScreenplayDocumentRecord | null {
	return (
		documents.find((document) => !document.deletedAt && document.title === UNTITLED_SCREENPLAY_TITLE && isBlankDraft(document)) ??
		null
	);
}
