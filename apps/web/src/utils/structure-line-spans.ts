import type { JSONContent } from '@tiptap/core';
import { getSceneHeadingsFromContent, getScreenplayBlocksFromContent } from '@dastan/fountain-parser';
import type { StructureBeat } from '../types';
import { getStructureLineColor } from './character-highlight';

export interface StructureLineSpan {
	beatId: string;
	label: string;
	color: string;
	startBlockIndex: number;
	endBlockIndex: number;
}

export function buildStructureLineSpans(
	content: JSONContent | null,
	beats: StructureBeat[],
): StructureLineSpan[] {
	if (!content) {
		return [];
	}

	const headings = getSceneHeadingsFromContent(content);
	const blocks = getScreenplayBlocksFromContent(content);
	const linked = [...beats]
		.filter((beat) => typeof beat.linkedSceneIndex === 'number')
		.sort((left, right) => left.linkedSceneIndex! - right.linkedSceneIndex!);

	return linked.map((beat, index) => {
		const startBlockIndex = beat.linkedSceneIndex!;
		const nextBeat = linked[index + 1];
		const endBlockIndex = nextBeat ? nextBeat.linkedSceneIndex! - 1 : Math.max(0, blocks.length - 1);

		return {
			beatId: beat.id,
			label: beat.label,
			color: getStructureLineColor(beat.order),
			startBlockIndex,
			endBlockIndex: Math.max(startBlockIndex, endBlockIndex),
		};
	});
}

export function getStructureBeatForBlockIndex(
	content: JSONContent | null,
	beats: StructureBeat[],
	blockIndex: number,
): { label: string; color: string } | null {
	for (const span of buildStructureLineSpans(content, beats)) {
		if (blockIndex >= span.startBlockIndex && blockIndex <= span.endBlockIndex) {
			return { label: span.label, color: span.color };
		}
	}

	return null;
}

export function getStructureBeatForSceneHeadingIndex(
	beats: StructureBeat[],
	sceneHeadingBlockIndex: number,
): { label: string; color: string } | null {
	for (const beat of beats) {
		if (beat.linkedSceneIndex === sceneHeadingBlockIndex) {
			return {
				label: beat.label,
				color: getStructureLineColor(beat.order),
			};
		}
	}

	return null;
}
