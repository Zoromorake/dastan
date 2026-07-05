import type { JSONContent } from '@tiptap/core';
import { getSceneHeadingsFromContent } from '@dastan/fountain-parser';
import type { ScreenplayWorkspaceData } from '../types';
import { toPlainTextScreenplay } from './screenplay-text';

export const MAX_SCRIPT_CHARS = 48_000;
const OPENING_CHARS = 16_000;
const ENDING_CHARS = 8_000;
const SCENE_EXCERPT_CHARS = 2_500;

function buildRollingSummary(workspace: ScreenplayWorkspaceData, sceneCount: number, totalChars: number): string {
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
		.map((act, index) => act.trim())
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

function extractSceneExcerpts(documentContent: JSONContent, maxChars: number): string {
	const fullText = toPlainTextScreenplay(documentContent);
	const headings = getSceneHeadingsFromContent(documentContent);

	if (headings.length === 0) {
		return '';
	}

	const sections: string[] = [];
	let budget = maxChars;

	for (let index = 0; index < headings.length && budget > 0; index += 1) {
		const start = headings[index].index;
		const end = headings[index + 1]?.index ?? fullText.length;
		const excerpt = fullText.slice(start, Math.min(end, start + SCENE_EXCERPT_CHARS)).trim();

		if (!excerpt) {
			continue;
		}

		const clipped = excerpt.slice(0, budget);
		sections.push(`Scene ${index + 1} excerpt:\n${clipped}`);
		budget -= clipped.length;
	}

	return sections.join('\n\n');
}

export function buildSmartScriptContext(
	documentContent: JSONContent | null,
	workspace: ScreenplayWorkspaceData,
	maxChars: number = MAX_SCRIPT_CHARS,
): string {
	if (!documentContent) {
		return '';
	}

	const fullText = toPlainTextScreenplay(documentContent);

	if (fullText.length <= maxChars) {
		return fullText;
	}

	const headings = getSceneHeadingsFromContent(documentContent);
	const outline =
		headings.length > 0
			? headings.map((scene, index) => `${index + 1}. ${scene.text}`).join('\n')
			: '(No scene headings yet)';

	const sections: string[] = [
		`[Full script is ${fullText.length.toLocaleString()} characters — using rolling summary, scene outline, targeted excerpts, and opening/ending.]`,
		buildRollingSummary(workspace, headings.length, fullText.length),
		`Scene outline (${headings.length} scenes):\n${outline}`,
	];

	const excerptBudget = Math.max(8_000, maxChars - sections.join('\n\n').length - OPENING_CHARS - ENDING_CHARS - 500);
	const sceneExcerpts = extractSceneExcerpts(documentContent, excerptBudget);

	if (sceneExcerpts) {
		sections.push(sceneExcerpts);
	}

	sections.push(`Script opening:\n${fullText.slice(0, OPENING_CHARS)}`);
	sections.push(`Script ending:\n${fullText.slice(-ENDING_CHARS)}`);

	const combined = sections.join('\n\n');

	if (combined.length <= maxChars) {
		return combined;
	}

	return `${combined.slice(0, maxChars)}\n\n[Context trimmed for token budget]`;
}
