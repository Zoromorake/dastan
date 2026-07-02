import type { JSONContent } from '@tiptap/core';
import { getSceneHeadingsFromContent } from '@dastan/fountain-parser';
import type { ScreenplayWorkspaceData } from '../types';
import { toPlainTextScreenplay } from './screenplay-text';

export const MAX_SCRIPT_CHARS = 24_000;
const OPENING_CHARS = 12_000;
const ENDING_CHARS = 4_000;

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
		`[Full script is ${fullText.length.toLocaleString()} characters — using scene outline plus opening and ending excerpts.]`,
		`Scene outline (${headings.length} scenes):\n${outline}`,
	];

	const synopsis = workspace.development.basics.synopsis.trim();
	const logline = workspace.development.basics.logline.trim();

	if (logline) {
		sections.push(`Logline:\n${logline}`);
	}

	if (synopsis) {
		sections.push(`Synopsis:\n${synopsis.slice(0, 1500)}`);
	}

	const actSummaries = workspace.development.basics.actSummaries
		.map((act, index) => act.trim())
		.filter(Boolean)
		.map((act, index) => `Act ${index + 1}: ${act}`);

	if (actSummaries.length > 0) {
		sections.push(`Act summaries:\n${actSummaries.join('\n')}`);
	}

	sections.push(`Script opening:\n${fullText.slice(0, OPENING_CHARS)}`);
	sections.push(`Script ending:\n${fullText.slice(-ENDING_CHARS)}`);

	const combined = sections.join('\n\n');

	if (combined.length <= maxChars) {
		return combined;
	}

	return `${combined.slice(0, maxChars)}\n\n[Context trimmed for token budget]`;
}
