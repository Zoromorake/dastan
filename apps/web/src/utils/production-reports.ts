import type { JSONContent } from '@tiptap/core';
import {
	getSceneHeadingsFromContent,
	getScreenplayBlocksFromContent,
	countWordsFromContent,
} from '@dastan/fountain-parser';

export interface SceneReportRow {
	sceneNumber: number;
	heading: string;
	intExt: string;
	dayNight: string;
	characters: string[];
	estimatedPages: number;
	omitted: boolean;
}

export interface CharacterReportRow {
	name: string;
	sceneCount: number;
	dialogueBlocks: number;
	wordCount: number;
	firstScene: number;
	lastScene: number;
}

export interface LocationReportRow {
	location: string;
	sceneCount: number;
}

function parseHeadingMeta(heading: string): { intExt: string; dayNight: string } {
	const upper = heading.toUpperCase();
	const intExt = upper.includes('EXT.') && upper.includes('INT.')
		? 'INT./EXT.'
		: upper.includes('EXT.')
			? 'EXT.'
			: upper.includes('INT.')
				? 'INT.'
				: '';
	const dayNight = upper.includes('NIGHT')
		? 'NIGHT'
		: upper.includes('DAY')
			? 'DAY'
			: upper.includes('MORNING')
				? 'MORNING'
				: upper.includes('EVENING')
					? 'EVENING'
					: '';
	return { intExt, dayNight };
}

function isSceneHeadingOmitted(node: JSONContent | undefined): boolean {
	return node?.type === 'scene_heading' && node.attrs?.omitted === true;
}

function collectCharactersInScene(
	blocks: ReturnType<typeof getScreenplayBlocksFromContent>,
	startIndex: number,
	endIndex: number,
): string[] {
	const names = new Set<string>();

	for (let index = startIndex; index < endIndex; index += 1) {
		const block = blocks[index];

		if (block?.type === 'character' && block.text.trim()) {
			names.add(block.text.trim().toUpperCase());
		}
	}

	return [...names].sort();
}

function extractLocation(heading: string): string {
	const stripped = heading
		.replace(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.?|E\/I\.?)\s*/iu, '')
		.replace(/\s*-\s*(DAY|NIGHT|MORNING|EVENING|CONTINUOUS|LATER|SAME|MOMENTS LATER).*$/iu, '')
		.trim();
	return stripped || heading.trim();
}

export function buildSceneReport(content: JSONContent | null): SceneReportRow[] {
	if (!content) {
		return [];
	}

	const headings = getSceneHeadingsFromContent(content);
	const blocks = getScreenplayBlocksFromContent(content);
	const nodes = content.content ?? [];

	return headings.map((heading, sceneIndex) => {
		const endIndex = headings[sceneIndex + 1]?.index ?? blocks.length;
		const node = nodes[heading.index];
		const omitted = isSceneHeadingOmitted(node);
		const meta = parseHeadingMeta(heading.text);
		const sceneBlockCount = endIndex - heading.index;
		const estimatedPages = Number((sceneBlockCount / 55).toFixed(2));

		return {
			sceneNumber: sceneIndex + 1,
			heading: heading.text,
			intExt: meta.intExt,
			dayNight: meta.dayNight,
			characters: omitted ? [] : collectCharactersInScene(blocks, heading.index, endIndex),
			estimatedPages: omitted ? 0 : estimatedPages,
			omitted,
		};
	});
}

export function buildCharacterReport(content: JSONContent | null): CharacterReportRow[] {
	const sceneReport = buildSceneReport(content);

	if (!content) {
		return [];
	}

	const blocks = getScreenplayBlocksFromContent(content);
	const headings = getSceneHeadingsFromContent(content);
	const stats = new Map<string, CharacterReportRow>();

	for (let sceneIndex = 0; sceneIndex < headings.length; sceneIndex += 1) {
		const start = headings[sceneIndex].index;
		const end = headings[sceneIndex + 1]?.index ?? blocks.length;
		const row = sceneReport[sceneIndex];

		if (row?.omitted) {
			continue;
		}

		for (const name of row?.characters ?? []) {
			const existing = stats.get(name) ?? {
				name,
				sceneCount: 0,
				dialogueBlocks: 0,
				wordCount: 0,
				firstScene: sceneIndex + 1,
				lastScene: sceneIndex + 1,
			};

			existing.sceneCount += 1;
			existing.lastScene = sceneIndex + 1;
			stats.set(name, existing);
		}

		for (let index = start; index < end; index += 1) {
			const block = blocks[index];

			if (block?.type !== 'dialogue') {
				continue;
			}

			let characterName = '';

			for (let cueIndex = index - 1; cueIndex >= start; cueIndex -= 1) {
				if (blocks[cueIndex]?.type === 'character') {
					characterName = blocks[cueIndex].text.trim().toUpperCase();
					break;
				}
			}

			if (!characterName) {
				continue;
			}

			const existing = stats.get(characterName) ?? {
				name: characterName,
				sceneCount: 0,
				dialogueBlocks: 0,
				wordCount: 0,
				firstScene: sceneIndex + 1,
				lastScene: sceneIndex + 1,
			};

			existing.dialogueBlocks += 1;
			existing.wordCount += block.text.trim().split(/\s+/u).filter(Boolean).length;
			stats.set(characterName, existing);
		}
	}

	return [...stats.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function buildLocationReport(content: JSONContent | null): LocationReportRow[] {
	const sceneReport = buildSceneReport(content);
	const counts = new Map<string, number>();

	for (const row of sceneReport) {
		if (row.omitted) {
			continue;
		}

		const location = extractLocation(row.heading);
		counts.set(location, (counts.get(location) ?? 0) + 1);
	}

	return [...counts.entries()]
		.map(([location, sceneCount]) => ({ location, sceneCount }))
		.sort((left, right) => left.location.localeCompare(right.location));
}

export function countScriptWords(content: JSONContent | null): number {
	return countWordsFromContent(content);
}
