import type { JSONContent } from '@tiptap/core';
import type { ScreenplayBlockType } from '../types';
import { getScreenplayBlocksFromContent } from './screenplay-text';

export interface PageBreakSegment {
	blockIndex: number;
	pageNumber: number;
}

const LINES_PER_PAGE = 55;

const charsPerLineByType: Record<ScreenplayBlockType, number> = {
	scene_heading: 62,
	action: 62,
	character: 26,
	dialogue: 36,
	parenthetical: 28,
	transition: 22,
	centered: 40,
	shot: 62,
	general: 62,
	lyrics: 36,
};

const spacingAfterByType: Record<ScreenplayBlockType, number> = {
	scene_heading: 1,
	action: 1,
	character: 0,
	dialogue: 0,
	parenthetical: 0,
	transition: 1,
	centered: 1,
	shot: 1,
	general: 1,
	lyrics: 0,
};

function estimateLinesForBlock(type: ScreenplayBlockType, text: string): number {
	const charsPerLine = charsPerLineByType[type];
	const normalizedLength = Math.max(1, text.trim().length);
	return Math.max(1, Math.ceil(normalizedLength / charsPerLine));
}

export function computePageBreaks(content: JSONContent | null): PageBreakSegment[] {
	const blocks = getScreenplayBlocksFromContent(content);
	const breaks: PageBreakSegment[] = [];
	let currentLine = 0;
	let pageNumber = 1;

	for (let index = 0; index < blocks.length; index += 1) {
		const block = blocks[index];
		const blockLines = estimateLinesForBlock(block.type, block.text);
		const spacingAfter = spacingAfterByType[block.type];

		if (currentLine > 0 && currentLine + blockLines > LINES_PER_PAGE) {
			breaks.push({ blockIndex: index, pageNumber: pageNumber + 1 });
			pageNumber += 1;
			currentLine = 0;
		}

		currentLine += blockLines + spacingAfter;

		while (currentLine > LINES_PER_PAGE) {
			breaks.push({ blockIndex: index, pageNumber: pageNumber + 1 });
			pageNumber += 1;
			currentLine -= LINES_PER_PAGE;
		}
	}

	return breaks;
}

export function groupBlocksByPage(content: JSONContent | null): number[][] {
	const blocks = getScreenplayBlocksFromContent(content);

	if (blocks.length === 0) {
		return [[]];
	}

	const breaks = computePageBreaks(content);
	const pages: number[][] = [[]];
	let breakPointer = 0;

	for (let index = 0; index < blocks.length; index += 1) {
		if (breakPointer < breaks.length && breaks[breakPointer].blockIndex === index) {
			pages.push([]);
			breakPointer += 1;
		}

		pages[pages.length - 1].push(index);
	}

	return pages;
}
