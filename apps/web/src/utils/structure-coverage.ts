import type { StructureBeat } from '../types';
import type { SceneHeadingSummary } from './screenplay-text';

export interface StructureCoverageIssue {
	beatId: string;
	beatLabel: string;
	kind: 'empty-summary' | 'unlinked-scene' | 'duplicate-scene';
	detail: string;
}

export interface StructureCoverageReport {
	totalBeats: number;
	filledBeats: number;
	linkedBeats: number;
	unmappedScenes: number;
	issues: StructureCoverageIssue[];
	scorePercent: number;
}

export function autoMapStructureBeatsToScenes(
	beats: StructureBeat[],
	scenes: SceneHeadingSummary[],
): StructureBeat[] {
	if (beats.length === 0 || scenes.length === 0) {
		return beats;
	}

	const ordered = [...beats].sort((left, right) => left.order - right.order);

	return ordered.map((beat, index) => {
		const sceneSlot = Math.min(
			scenes.length - 1,
			Math.floor((index / ordered.length) * scenes.length),
		);
		const scene = scenes[sceneSlot];

		return {
			...beat,
			linkedSceneIndex: scene?.index,
		};
	});
}

export function analyzeStructureCoverage(
	beats: StructureBeat[],
	scenes: SceneHeadingSummary[],
): StructureCoverageReport {
	const ordered = [...beats].sort((left, right) => left.order - right.order);
	const issues: StructureCoverageIssue[] = [];
	const linkedSceneIndices = new Set<number>();

	for (const beat of ordered) {
		if (!beat.summary.trim()) {
			issues.push({
				beatId: beat.id,
				beatLabel: beat.label,
				kind: 'empty-summary',
				detail: 'No summary written for this beat yet.',
			});
		}

		if (typeof beat.linkedSceneIndex === 'number') {
			if (linkedSceneIndices.has(beat.linkedSceneIndex)) {
				issues.push({
					beatId: beat.id,
					beatLabel: beat.label,
					kind: 'duplicate-scene',
					detail: 'Multiple beats point to the same scene.',
				});
			}

			linkedSceneIndices.add(beat.linkedSceneIndex);
		} else if (scenes.length > 0) {
			issues.push({
				beatId: beat.id,
				beatLabel: beat.label,
				kind: 'unlinked-scene',
				detail: 'Not linked to a scene in the script.',
			});
		}
	}

	const filledBeats = ordered.filter((beat) => beat.summary.trim().length > 0).length;
	const linkedBeats = ordered.filter((beat) => typeof beat.linkedSceneIndex === 'number').length;
	const unmappedScenes = scenes.filter((scene) => !linkedSceneIndices.has(scene.index)).length;

	const completionScore =
		ordered.length > 0 ? Math.round((filledBeats / ordered.length) * 70) : 0;
	const linkageScore =
		ordered.length > 0 && scenes.length > 0
			? Math.round((linkedBeats / ordered.length) * 30)
			: ordered.length > 0
				? 30
				: 0;

	return {
		totalBeats: ordered.length,
		filledBeats,
		linkedBeats,
		unmappedScenes,
		issues,
		scorePercent: Math.min(100, completionScore + linkageScore),
	};
}

export function buildStructureCoveragePrompt(report: StructureCoverageReport): string {
	const issueLines = report.issues
		.slice(0, 12)
		.map((issue) => `- ${issue.beatLabel}: ${issue.detail}`)
		.join('\n');

	return [
		'Review my screenplay structure and identify missing or weak beats.',
		`Coverage score: ${report.scorePercent}% (${report.filledBeats}/${report.totalBeats} beats filled, ${report.linkedBeats} linked to scenes, ${report.unmappedScenes} scenes unmapped).`,
		issueLines.length > 0 ? `Known gaps:\n${issueLines}` : 'All beats have summaries and scene links.',
		'Which beats are missing, underdeveloped, or out of order? Suggest concrete fixes.',
	].join('\n\n');
}

export function getSceneLabel(scenes: SceneHeadingSummary[], sceneIndex: number | undefined): string {
	if (typeof sceneIndex !== 'number') {
		return 'No scene linked';
	}

	const scene = scenes.find((item) => item.index === sceneIndex);

	return scene?.text?.trim() || `Scene at block ${sceneIndex}`;
}
