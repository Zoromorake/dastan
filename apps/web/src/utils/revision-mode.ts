import type { JSONContent } from '@tiptap/core';
import type {
	RevisionSetRecord,
	ScreenplayDocumentRecord,
	ScreenplayRevisionColor,
	ScreenplayVersionSnapshot,
} from '../types';

export const REVISION_SET_ORDER: Array<{ color: ScreenplayRevisionColor; label: string }> = [
	{ color: 'white', label: 'White' },
	{ color: 'blue', label: 'Blue' },
	{ color: 'pink', label: 'Pink' },
	{ color: 'yellow', label: 'Yellow' },
	{ color: 'green', label: 'Green' },
	{ color: 'goldenrod', label: 'Goldenrod' },
];

export function resolveBaselineSnapshot(
	versions: ScreenplayVersionSnapshot[],
	revisionSets: RevisionSetRecord[],
	activeRevisionSetId: string | null,
): ScreenplayVersionSnapshot | null {
	if (activeRevisionSetId) {
		const activeSet = revisionSets.find((set) => set.id === activeRevisionSetId);

		if (activeSet) {
			return versions.find((version) => version.id === activeSet.baselineVersionId) ?? null;
		}
	}

	const manual = versions.find((version) => version.isManual);

	if (manual) {
		return manual;
	}

	return versions[0] ?? null;
}

export function createRevisionSetRecord(
	color: ScreenplayRevisionColor,
	baselineVersionId: string,
	existingSets: RevisionSetRecord[],
): RevisionSetRecord {
	const label = REVISION_SET_ORDER.find((entry) => entry.color === color)?.label ?? color;

	return {
		id: crypto.randomUUID(),
		label: `${label} Revision`,
		color,
		baselineVersionId,
		createdAt: new Date().toISOString(),
	};
}

export function toggleSceneOmitted(content: JSONContent, sceneHeadingBlockIndex: number, omitted: boolean): JSONContent {
	const nodes = [...(content.content ?? [])];
	const node = nodes[sceneHeadingBlockIndex];

	if (!node || node.type !== 'scene_heading') {
		return content;
	}

	nodes[sceneHeadingBlockIndex] = {
		...node,
		attrs: { ...(node.attrs ?? {}), omitted },
	};

	return { ...content, content: nodes };
}

export function getOmittedSceneHeadingText(originalHeading: string): string {
	return originalHeading.trim().length > 0 ? 'OMITTED' : 'OMITTED';
}

export function buildRevisionExportHeader(
	activeSet: RevisionSetRecord | null,
): string {
	if (!activeSet) {
		return '';
	}

	const date = new Date(activeSet.createdAt).toLocaleDateString();
	return `${activeSet.label} — ${date}`;
}

export function buildRevisionHistoryBox(revisionSets: RevisionSetRecord[]): string {
	if (revisionSets.length === 0) {
		return '';
	}

	return revisionSets
		.map((set) => {
			const date = new Date(set.createdAt).toLocaleDateString();
			return `${set.label} — ${date}`;
		})
		.join('\n');
}

export function applyRevisionBorderClass(color: ScreenplayRevisionColor): string {
	return color === 'none' ? '' : `revision-border-${color}`;
}

export function snapshotDocumentForRevision(document: ScreenplayDocumentRecord): ScreenplayDocumentRecord {
	return document;
}
