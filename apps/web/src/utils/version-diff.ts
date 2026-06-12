import type { JSONContent } from '@tiptap/core';
import { toPlainTextScreenplay } from './screenplay-text';

export interface TextDiffLine {
	type: 'same' | 'added' | 'removed';
	text: string;
}

export function diffPlainText(left: string, right: string): TextDiffLine[] {
	const leftLines = left.split('\n');
	const rightLines = right.split('\n');
	const result: TextDiffLine[] = [];
	let leftIndex = 0;
	let rightIndex = 0;

	while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
		const leftLine = leftLines[leftIndex];
		const rightLine = rightLines[rightIndex];

		if (leftLine === rightLine) {
			result.push({ type: 'same', text: leftLine ?? '' });
			leftIndex += 1;
			rightIndex += 1;
			continue;
		}

		const nextLeftInRight = rightLines.indexOf(leftLine ?? '', rightIndex);
		const nextRightInLeft = leftLines.indexOf(rightLine ?? '', leftIndex);

		if (nextLeftInRight !== -1 && (nextRightInLeft === -1 || nextLeftInRight - rightIndex <= nextRightInLeft - leftIndex)) {
			while (rightIndex < nextLeftInRight) {
				result.push({ type: 'added', text: rightLines[rightIndex] ?? '' });
				rightIndex += 1;
			}
			continue;
		}

		if (nextRightInLeft !== -1) {
			while (leftIndex < nextRightInLeft) {
				result.push({ type: 'removed', text: leftLines[leftIndex] ?? '' });
				leftIndex += 1;
			}
			continue;
		}

		if (leftIndex < leftLines.length) {
			result.push({ type: 'removed', text: leftLines[leftIndex] ?? '' });
			leftIndex += 1;
		}

		if (rightIndex < rightLines.length) {
			result.push({ type: 'added', text: rightLines[rightIndex] ?? '' });
			rightIndex += 1;
		}
	}

	return result;
}

export function diffScreenplayContent(current: JSONContent | null, previous: JSONContent | null): TextDiffLine[] {
	return diffPlainText(toPlainTextScreenplay(previous), toPlainTextScreenplay(current));
}

export function summarizeDiff(lines: TextDiffLine[]): { added: number; removed: number; changed: number } {
	let added = 0;
	let removed = 0;

	for (const line of lines) {
		if (line.type === 'added') {
			added += 1;
		}

		if (line.type === 'removed') {
			removed += 1;
		}
	}

	return { added, removed, changed: added + removed };
}
