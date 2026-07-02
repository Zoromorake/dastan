import type { JSONContent } from '@tiptap/core';
import { parseScreenplayTextToContent } from '@dastan/fountain-parser';

const SCREENPLAY_LINE_PATTERN =
	/^(INT\.|EXT\.|INT\/EXT|I\/E\.|FADE IN|FADE OUT|CUT TO|\s{10,}[A-Z][A-Z0-9 .'\-(]+)$/mu;

/** Detect whether pasted text looks like screenplay-formatted content. */
export function looksLikeScreenplayText(text: string): boolean {
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return false;
	}

	const matches = lines.filter((line) => SCREENPLAY_LINE_PATTERN.test(line)).length;
	return matches >= Math.min(2, lines.length);
}

/** Parse screenplay text into TipTap JSON blocks for insertion. */
export function parseScreenplayInsertText(text: string): JSONContent {
	return parseScreenplayTextToContent(text);
}
