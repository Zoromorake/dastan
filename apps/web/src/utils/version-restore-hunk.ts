import type { JSONContent } from '@tiptap/core';
import { getScreenplayBlocksFromContent } from '@dastan/fountain-parser';

export function restoreRemovedLineToContent(
	current: JSONContent,
	baseline: JSONContent,
	removedLine: string,
): JSONContent {
	const trimmed = removedLine.trim();

	if (!trimmed) {
		return current;
	}

	const baselineBlock = getScreenplayBlocksFromContent(baseline).find((block) => block.text.trim() === trimmed);

	if (!baselineBlock) {
		return current;
	}

	return {
		...current,
		content: [
			...(current.content ?? []),
			{
				type: baselineBlock.type,
				content: [{ type: 'text', text: baselineBlock.text }],
			},
		],
	};
}
