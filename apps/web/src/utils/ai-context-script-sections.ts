import type { JSONContent } from '@tiptap/core';
import type { ScreenplayWorkspaceData } from '../types';
import {
	buildRollingSummary,
	extractSceneExcerpt,
	extractSceneFullText,
	getSceneIndexForBlockIndex,
	MAX_SCRIPT_CHARS,
} from './ai-context-script';
import { getSceneHeadingsFromContent } from '@dastan/fountain-parser';
import { toPlainTextScreenplay } from './screenplay-text';
import type { ScriptContextSections } from './ai-script-context-options';
import type { ContextManifestSectionId } from './context-manifest';

export interface ScriptSectionEstimate {
	id: ContextManifestSectionId;
	label: string;
	charCount: number;
	toggleable: boolean;
	enabled: boolean;
}

export function estimateScriptContextSections(
	documentContent: JSONContent,
	workspace: ScreenplayWorkspaceData,
	activeBlockIndex: number | null,
	sections: ScriptContextSections,
): ScriptSectionEstimate[] {
	const fullText = toPlainTextScreenplay(documentContent);
	const headings = getSceneHeadingsFromContent(documentContent);
	const sceneCount = Math.max(headings.length, 1);
	const activeSceneIndex =
		typeof activeBlockIndex === 'number'
			? getSceneIndexForBlockIndex(documentContent, activeBlockIndex)
			: 0;

	const results: ScriptSectionEstimate[] = [];

	const activeSceneText = extractSceneFullText(documentContent, activeSceneIndex);

	if (activeSceneText.trim()) {
		results.push({
			id: 'active_scene',
			label: `Active scene (Scene ${activeSceneIndex + 1})`,
			charCount: activeSceneText.length,
			toggleable: false,
			enabled: true,
		});
	}

	if (sections.neighboringScenes) {
		let neighborChars = 0;

		for (const neighborIndex of [activeSceneIndex - 1, activeSceneIndex + 1]) {
			if (neighborIndex < 0 || neighborIndex >= sceneCount) {
				continue;
			}

			neighborChars += extractSceneFullText(documentContent, neighborIndex).length;
		}

		results.push({
			id: 'neighboring_scenes',
			label: 'Neighboring scenes',
			charCount: neighborChars,
			toggleable: true,
			enabled: true,
		});
	} else {
		results.push({
			id: 'neighboring_scenes',
			label: 'Neighboring scenes',
			charCount: 0,
			toggleable: true,
			enabled: false,
		});
	}

	if (sections.rollingSummary) {
		const summary = buildRollingSummary(workspace, sceneCount, fullText.length);
		results.push({
			id: 'rolling_summary',
			label: 'Rolling summary',
			charCount: summary.length,
			toggleable: true,
			enabled: true,
		});
	} else {
		results.push({
			id: 'rolling_summary',
			label: 'Rolling summary',
			charCount: 0,
			toggleable: true,
			enabled: false,
		});
	}

	if (sections.sceneOutline) {
		const outline =
			headings.length > 0
				? headings.map((scene, index) => `${index + 1}. ${scene.text}`).join('\n')
				: '(No scene headings yet)';
		results.push({
			id: 'scene_outline',
			label: 'Scene outline',
			charCount: outline.length,
			toggleable: true,
			enabled: true,
		});
	} else {
		results.push({
			id: 'scene_outline',
			label: 'Scene outline',
			charCount: 0,
			toggleable: true,
			enabled: false,
		});
	}

	if (sections.otherSceneExcerpts) {
		let excerptChars = 0;
		const visited = new Set<number>([activeSceneIndex]);

		for (let distance = 1; visited.size < sceneCount && distance < sceneCount; distance += 1) {
			for (const sceneIndex of [activeSceneIndex - distance, activeSceneIndex + distance]) {
				if (sceneIndex < 0 || sceneIndex >= sceneCount || visited.has(sceneIndex)) {
					continue;
				}

				const excerpt = extractSceneExcerpt(documentContent, sceneIndex, 2500);
				excerptChars += excerpt.length;
				visited.add(sceneIndex);
			}
		}

		results.push({
			id: 'other_scene_excerpts',
			label: 'Other-scene excerpts',
			charCount: excerptChars,
			toggleable: true,
			enabled: true,
		});
	} else {
		results.push({
			id: 'other_scene_excerpts',
			label: 'Other-scene excerpts',
			charCount: 0,
			toggleable: true,
			enabled: false,
		});
	}

	const OPENING_CHARS = 6_000;
	const ENDING_CHARS = 4_000;

	if (fullText.length > MAX_SCRIPT_CHARS) {
		results.push({
			id: 'script_opening',
			label: 'Script opening',
			charCount: sections.scriptOpening ? Math.min(OPENING_CHARS, fullText.length) : 0,
			toggleable: true,
			enabled: sections.scriptOpening,
		});
		results.push({
			id: 'script_ending',
			label: 'Script ending',
			charCount: sections.scriptEnding ? Math.min(ENDING_CHARS, fullText.length) : 0,
			toggleable: true,
			enabled: sections.scriptEnding,
		});
	}

	return results;
}
