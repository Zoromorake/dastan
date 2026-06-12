import type { JSONContent } from '@tiptap/core';
import type { ScreenplayBlockType } from '@dastan/screenplay-model';
import { getScreenplayBlocksFromContent } from '@dastan/fountain-parser';

export interface ScreenplayPaginationAnalysis {
  estimatedPages: number;
  pageBreakCount: number;
  dialogueSplitCount: number;
  continuedCueCount: number;
  widowRiskCount: number;
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

export function analyzeScreenplayPagination(content: JSONContent | null): ScreenplayPaginationAnalysis {
  const blocks = getScreenplayBlocksFromContent(content);

  if (blocks.length === 0) {
    return {
      estimatedPages: 1,
      pageBreakCount: 0,
      dialogueSplitCount: 0,
      continuedCueCount: 0,
      widowRiskCount: 0,
    };
  }

  let currentLine = 0;
  let pageBreakCount = 0;
  let dialogueSplitCount = 0;
  let widowRiskCount = 0;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const nextBlock = index < blocks.length - 1 ? blocks[index + 1] : null;

    const blockLines = estimateLinesForBlock(block.type, block.text);
    const spacingAfter = spacingAfterByType[block.type];

    if (block.type === 'character' && nextBlock?.type === 'dialogue') {
      const neededForPair = blockLines + estimateLinesForBlock(nextBlock.type, nextBlock.text);
      const remaining = LINES_PER_PAGE - currentLine;

      if (remaining < neededForPair && remaining <= 2) {
        widowRiskCount += 1;
      }
    }

    if (currentLine + blockLines > LINES_PER_PAGE) {
      pageBreakCount += 1;
      currentLine = 0;

      if (block.type === 'dialogue' || block.type === 'parenthetical') {
        dialogueSplitCount += 1;
      }
    }

    currentLine += blockLines + spacingAfter;

    while (currentLine > LINES_PER_PAGE) {
      pageBreakCount += 1;
      currentLine -= LINES_PER_PAGE;

      if (block.type === 'dialogue' || block.type === 'parenthetical') {
        dialogueSplitCount += 1;
      }
    }
  }

  return {
    estimatedPages: Math.max(1, pageBreakCount + 1),
    pageBreakCount,
    dialogueSplitCount,
    continuedCueCount: dialogueSplitCount,
    widowRiskCount,
  };
}
