import type { ScreenplayDialogueBreakSettings, ScreenplaySceneBreakSettings } from '@dastan/screenplay-model';
import type { ScreenplayBlockType } from '../types';
import { getScreenplayBlocksFromContent } from './screenplay-text';
import type { JSONContent } from '@tiptap/core';

export interface PaginationBreakAnnotation {
	blockIndex: number;
	kind: 'more' | 'character_continued' | 'scene_continued_bottom' | 'scene_continued_top';
	text: string;
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

function findCharacterForDialogue(
	blocks: Array<{ type: ScreenplayBlockType; text: string }>,
	dialogueIndex: number,
): string | null {
	for (let index = dialogueIndex - 1; index >= 0; index -= 1) {
		const block = blocks[index];

		if (block.type === 'character') {
			return block.text.trim();
		}

		if (block.type === 'scene_heading' || block.type === 'transition') {
			break;
		}
	}

	return null;
}

export function computePaginationBreakAnnotations(
	content: JSONContent | null,
	dialogueBreaks: ScreenplayDialogueBreakSettings,
	sceneBreaks: ScreenplaySceneBreakSettings,
): PaginationBreakAnnotation[] {
	const blocks = getScreenplayBlocksFromContent(content);
	const annotations: PaginationBreakAnnotation[] = [];

	if (blocks.length === 0) {
		return annotations;
	}

	let currentLine = 0;

	for (let index = 0; index < blocks.length; index += 1) {
		const block = blocks[index];
		const blockLines = estimateLinesForBlock(block.type, block.text);
		const spacingAfter = spacingAfterByType[block.type];
		const remaining = LINES_PER_PAGE - currentLine;

		const crossesPage = currentLine > 0 && currentLine + blockLines > LINES_PER_PAGE;
		const overflowsWithinBlock = blockLines > remaining && remaining > 0 && remaining < LINES_PER_PAGE;

		if (crossesPage || overflowsWithinBlock) {
			if (
				(block.type === 'dialogue' || block.type === 'parenthetical') &&
				dialogueBreaks.showMoreAtPageBottom
			) {
				annotations.push({
					blockIndex: index,
					kind: 'more',
					text: dialogueBreaks.moreText,
				});
			}

			if (block.type === 'scene_heading' && sceneBreaks.showContinuedAtPageBottom) {
				annotations.push({
					blockIndex: index,
					kind: 'scene_continued_bottom',
					text: sceneBreaks.continuedBottomText,
				});
			}

			if (
				(block.type === 'dialogue' || block.type === 'parenthetical') &&
				dialogueBreaks.showContinuedAtPageTop &&
				dialogueBreaks.autoCharacterContinueds
			) {
				const characterName = findCharacterForDialogue(blocks, index);

				if (characterName) {
					annotations.push({
						blockIndex: index,
						kind: 'character_continued',
						text: `${characterName} ${dialogueBreaks.continuedText}`,
					});
				}
			}

			if (block.type === 'scene_heading' && sceneBreaks.showContinuedAtPageTop) {
				annotations.push({
					blockIndex: index,
					kind: 'scene_continued_top',
					text: sceneBreaks.continuedTopText,
				});
			}
		}

		if (crossesPage) {
			currentLine = 0;
		}

		currentLine += blockLines + spacingAfter;

		while (currentLine > LINES_PER_PAGE) {
			currentLine -= LINES_PER_PAGE;
		}
	}

	return annotations;
}
