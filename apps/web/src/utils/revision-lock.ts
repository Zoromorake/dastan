import type { JSONContent } from '@tiptap/core';
import { computePageBreaks } from './page-breaks';

export function getBlockPageNumber(blockIndex: number, content: JSONContent | null): number {
	const breaks = computePageBreaks(content);

	for (let index = breaks.length - 1; index >= 0; index -= 1) {
		const segment = breaks[index];

		if (blockIndex >= segment.blockIndex) {
			return segment.pageNumber;
		}
	}

	return 1;
}

export function isBlockRevisionLocked(
	blockIndex: number,
	content: JSONContent | null,
	lockedPageCount: number,
	revisionModeActive: boolean,
): boolean {
	if (!revisionModeActive || lockedPageCount <= 0) {
		return false;
	}

	return getBlockPageNumber(blockIndex, content) <= lockedPageCount;
}
