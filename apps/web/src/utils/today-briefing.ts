import type { JSONContent } from '@tiptap/core';
import type { ScreenplayDocumentRecord } from '../types';
import {
	countWordsFromContent,
	getSceneHeadingsFromContent,
	getScreenplayBlocksFromContent,
} from './screenplay-text';
import type { DocumentSessionStats } from './document-session-stats';
import { getYesterdayPageTotal } from './document-session-stats';
import type { WritingStatsState } from './writing-stats';
import { getActiveRevisionColor } from './hub-script-meta';

export interface TodayBriefingInput {
	document: ScreenplayDocumentRecord;
	sessionStats: DocumentSessionStats | null;
	writingStats: WritingStatsState;
	yesterdayPages?: number;
}

export interface TodayBriefingResult {
	lines: string[];
	activeSceneHeading: string | null;
	activeSceneNumber: number | null;
}

function countUnlinkedBeats(document: ScreenplayDocumentRecord): number {
	const beats = document.workspace?.development?.structureBeats ?? [];

	return beats.filter((beat) => beat.summary.trim().length > 0 && typeof beat.linkedSceneIndex !== 'number').length;
}

function countEmptyBeatSummaries(document: ScreenplayDocumentRecord): number {
	const beats = document.workspace?.development?.structureBeats ?? [];

	return beats.filter((beat) => beat.summary.trim().length === 0).length;
}

export function getSceneHeadingAtBlockIndex(content: JSONContent | null, blockIndex: number | undefined): string | null {
	if (typeof blockIndex !== 'number' || blockIndex < 0) {
		return null;
	}

	const blocks = getScreenplayBlocksFromContent(content);
	const block = blocks[blockIndex];

	if (!block) {
		return null;
	}

	if (block.type === 'scene_heading') {
		return block.text || null;
	}

	for (let index = blockIndex; index >= 0; index -= 1) {
		const prior = blocks[index];

		if (prior?.type === 'scene_heading' && prior.text.trim().length > 0) {
			return prior.text;
		}
	}

	return null;
}

export function getSceneNumberAtBlockIndex(content: JSONContent | null, blockIndex: number | undefined): number | null {
	if (typeof blockIndex !== 'number') {
		return null;
	}

	const headings = getSceneHeadingsFromContent(content);

	for (let index = headings.length - 1; index >= 0; index -= 1) {
		if (headings[index]!.index <= blockIndex) {
			return index + 1;
		}
	}

	return headings.length > 0 ? 1 : null;
}

export function buildTodayBriefing(input: TodayBriefingInput): TodayBriefingResult {
	const { document, sessionStats, writingStats } = input;
	const title = (document.title || 'Untitled').toUpperCase();
	const blockIndex = document.lastCursorBlockIndex;
	const activeSceneHeading = getSceneHeadingAtBlockIndex(document.content, blockIndex);
	const activeSceneNumber = getSceneNumberAtBlockIndex(document.content, blockIndex);
	const lines: string[] = [];

	if (activeSceneNumber) {
		lines.push(`You're on scene ${activeSceneNumber} of ${title}.`);
	} else if (countWordsFromContent(document.content) > 0) {
		lines.push(`You're writing ${title}.`);
	}

	const unlinked = countUnlinkedBeats(document);

	if (unlinked > 0) {
		lines.push(`${unlinked} beat${unlinked === 1 ? '' : 's'} on your board are unlinked.`);
	}

	const revisionColor = getActiveRevisionColor(document);

	if (revisionColor && revisionColor !== 'none') {
		lines.push(`Revision mode is on (${revisionColor}).`);
	}

	const yesterdayPages = input.yesterdayPages ?? getYesterdayPageTotal();

	if (yesterdayPages > 0) {
		const label = yesterdayPages === 1 ? '1 page' : `${yesterdayPages} pages`;
		lines.push(`Yesterday: ${label}.`);
	}

	if (sessionStats && sessionStats.wordsAdded > 0) {
		const pageLabel = sessionStats.pagesAdded === 1 ? '1 page' : `${sessionStats.pagesAdded} pages`;
		lines.push(`This session: ${pageLabel}.`);
	}

	if (writingStats.streakDays > 1) {
		lines.push(`${writingStats.streakDays}-day streak.`);
	}

	const emptyBeats = countEmptyBeatSummaries(document);

	if (lines.length < 3 && emptyBeats > 0) {
		lines.push(`${emptyBeats} beat${emptyBeats === 1 ? '' : 's'} still open on your sheet.`);
	}

	return {
		lines: lines.slice(0, 3),
		activeSceneHeading,
		activeSceneNumber,
	};
}
