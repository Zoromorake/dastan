import type { JSONContent } from '@tiptap/core';
import { getSceneHeadingsFromContent, getScreenplayBlocksFromContent } from '@dastan/fountain-parser';
import type { ScreenplayWorkspaceData } from '../types';
import { defaultScriptContextSections, type ScriptContextSections } from './ai-script-context-options';
import { toPlainTextScreenplay } from './screenplay-text';

export const MAX_SCRIPT_CHARS = 48_000;
const OPENING_CHARS = 6_000;
const ENDING_CHARS = 4_000;
const SCENE_EXCERPT_CHARS = 2_500;

function getSceneIndexForBlockIndex(content: JSONContent, blockIndex: number): number {
	const headings = getSceneHeadingsFromContent(content);

	if (headings.length === 0) {
		return 0;
	}

	for (let index = headings.length - 1; index >= 0; index -= 1) {
		if (blockIndex >= headings[index].index) {
			return index;
		}
	}

	return 0;
}

export function extractSceneFullText(content: JSONContent, sceneIndex: number): string {
	const headings = getSceneHeadingsFromContent(content);
	const blocks = getScreenplayBlocksFromContent(content);

	if (headings.length === 0) {
		return toPlainTextScreenplay(content);
	}

	const startBlock = headings[sceneIndex]?.index ?? 0;
	const endBlock =
		sceneIndex + 1 < headings.length ? headings[sceneIndex + 1].index : blocks.length;

	return blocks
		.slice(startBlock, endBlock)
		.map((block) => block.text.trim())
		.filter(Boolean)
		.join('\n');
}

export function buildRollingSummary(workspace: ScreenplayWorkspaceData, sceneCount: number, totalChars: number): string {
	const { basics, structureBeats } = workspace.development;
	const lines: string[] = [
		`Rolling story summary (${sceneCount} scenes, ${totalChars.toLocaleString()} characters):`,
	];

	if (basics.logline.trim()) {
		lines.push(`Logline: ${basics.logline.trim()}`);
	}

	if (basics.synopsis.trim()) {
		lines.push(`Synopsis: ${basics.synopsis.trim().slice(0, 1200)}`);
	}

	const actSummaries = basics.actSummaries
		.map((act) => act.trim())
		.filter(Boolean)
		.map((act, index) => `Act ${index + 1}: ${act}`);

	if (actSummaries.length > 0) {
		lines.push(actSummaries.join('\n'));
	}

	if (structureBeats.length > 0) {
		const beatLines = [...structureBeats]
			.sort((left, right) => left.order - right.order)
			.slice(0, 20)
			.map((beat) => `${beat.label}: ${beat.summary || '(empty)'}`)
			.join('\n');
		lines.push(`Structure beats:\n${beatLines}`);
	}

	if (workspace.beatBoard.length > 0) {
		const boardLines = [...workspace.beatBoard]
			.sort((left, right) => left.order - right.order)
			.slice(0, 12)
			.map((beat) => `${beat.heading}: ${beat.beat}`)
			.join('\n');
		lines.push(`Beat board highlights:\n${boardLines}`);
	}

	return lines.join('\n\n');
}

export function extractSceneExcerpt(content: JSONContent, sceneIndex: number, maxChars: number): string {
	const fullScene = extractSceneFullText(content, sceneIndex).trim();

	if (!fullScene) {
		return '';
	}

	const clipped = fullScene.slice(0, Math.min(maxChars, SCENE_EXCERPT_CHARS));
	return `Scene ${sceneIndex + 1} excerpt:\n${clipped}`;
}

function extractRadiatingSceneExcerpts(
	content: JSONContent,
	activeSceneIndex: number,
	sceneCount: number,
	maxChars: number,
): string {
	const sections: string[] = [];
	let budget = maxChars;
	const visited = new Set<number>([activeSceneIndex]);

	for (let distance = 1; budget > 0 && visited.size < sceneCount; distance += 1) {
		const candidates = [activeSceneIndex - distance, activeSceneIndex + distance].filter(
			(index) => index >= 0 && index < sceneCount && !visited.has(index),
		);

		for (const sceneIndex of candidates) {
			if (budget <= 0) {
				break;
			}

			const excerpt = extractSceneExcerpt(content, sceneIndex, budget);

			if (!excerpt) {
				continue;
			}

			sections.push(excerpt);
			budget -= excerpt.length;
			visited.add(sceneIndex);
		}
	}

	return sections.join('\n\n');
}

export function buildSmartScriptContext(
	documentContent: JSONContent | null,
	workspace: ScreenplayWorkspaceData,
	maxChars: number = MAX_SCRIPT_CHARS,
	activeBlockIndex?: number | null,
	sectionToggles: ScriptContextSections = defaultScriptContextSections(),
): string {
	if (!documentContent) {
		return '';
	}

	const fullText = toPlainTextScreenplay(documentContent);

	if (fullText.length <= maxChars) {
		return fullText;
	}

	const headings = getSceneHeadingsFromContent(documentContent);
	const sceneCount = Math.max(headings.length, 1);
	const activeSceneIndex =
		typeof activeBlockIndex === 'number'
			? getSceneIndexForBlockIndex(documentContent, activeBlockIndex)
			: 0;

	const outline =
		headings.length > 0
			? headings.map((scene, index) => `${index + 1}. ${scene.text}`).join('\n')
			: '(No scene headings yet)';

	const sections: string[] = [
		`[Full script is ${fullText.length.toLocaleString()} characters — prioritizing scene ${activeSceneIndex + 1} (cursor), neighbors, summary, outline, and radiating excerpts.]`,
	];

	const activeSceneText = extractSceneFullText(documentContent, activeSceneIndex);

	if (activeSceneText.trim()) {
		sections.push(`Active scene (full text, scene ${activeSceneIndex + 1}):\n${activeSceneText}`);
	}

	if (sectionToggles.neighboringScenes) {
		for (const neighborIndex of [activeSceneIndex - 1, activeSceneIndex + 1]) {
			if (neighborIndex < 0 || neighborIndex >= sceneCount) {
				continue;
			}

			const neighborText = extractSceneFullText(documentContent, neighborIndex);

			if (neighborText.trim()) {
				sections.push(`Adjacent scene (full text, scene ${neighborIndex + 1}):\n${neighborText}`);
			}
		}
	}

	if (sectionToggles.rollingSummary) {
		sections.push(buildRollingSummary(workspace, sceneCount, fullText.length));
	}

	if (sectionToggles.sceneOutline) {
		sections.push(`Scene outline (${headings.length} scenes):\n${outline}`);
	}

	const openingReserve = sectionToggles.scriptOpening ? OPENING_CHARS : 0;
	const endingReserve = sectionToggles.scriptEnding ? ENDING_CHARS : 0;
	const usedChars = sections.join('\n\n').length;
	const excerptBudget = Math.max(4_000, maxChars - usedChars - openingReserve - endingReserve - 500);

	if (sectionToggles.otherSceneExcerpts) {
		const radiatingExcerpts = extractRadiatingSceneExcerpts(
			documentContent,
			activeSceneIndex,
			sceneCount,
			excerptBudget,
		);

		if (radiatingExcerpts) {
			sections.push(radiatingExcerpts);
		}
	}

	const openingEndingBudget = Math.max(0, maxChars - sections.join('\n\n').length - 200);

	if (openingEndingBudget > 0 && (sectionToggles.scriptOpening || sectionToggles.scriptEnding)) {
		const openingBudget = sectionToggles.scriptOpening
			? Math.min(OPENING_CHARS, Math.floor(openingEndingBudget * (sectionToggles.scriptEnding ? 0.6 : 1)))
			: 0;
		const endingBudget = sectionToggles.scriptEnding
			? Math.min(ENDING_CHARS, openingEndingBudget - openingBudget)
			: 0;

		if (openingBudget > 0) {
			sections.push(`Script opening:\n${fullText.slice(0, openingBudget)}`);
		}

		if (endingBudget > 0) {
			sections.push(`Script ending:\n${fullText.slice(-endingBudget)}`);
		}
	}

	const combined = sections.join('\n\n');

	if (combined.length <= maxChars) {
		return combined;
	}

	return `${combined.slice(0, maxChars)}\n\n[Context trimmed for token budget]`;
}

export { getSceneIndexForBlockIndex };
