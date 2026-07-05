import type { JSONContent } from '@tiptap/core';
import { getScreenplayBlocksFromContent } from '@dastan/fountain-parser';

export function getChangedBlockIndices(
	current: JSONContent | null,
	baseline: JSONContent | null,
): number[] {
	const currentBlocks = getScreenplayBlocksFromContent(current);
	const baselineBlocks = getScreenplayBlocksFromContent(baseline);
	const changed: number[] = [];
	const maxLength = Math.max(currentBlocks.length, baselineBlocks.length);

	for (let index = 0; index < maxLength; index += 1) {
		const currentBlock = currentBlocks[index];
		const baselineBlock = baselineBlocks[index];

		if (!currentBlock) {
			continue;
		}

		if (
			!baselineBlock ||
			currentBlock.type !== baselineBlock.type ||
			currentBlock.text.trim() !== baselineBlock.text.trim()
		) {
			changed.push(index);
		}
	}

	return changed;
}
