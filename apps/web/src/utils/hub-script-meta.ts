import type { ScreenplayDocumentRecord, ScreenplayRevisionColor } from '../types';

const REVISION_DOT_COLORS: Record<ScreenplayRevisionColor, string> = {
	none: 'transparent',
	white: '#e7e5e4',
	blue: '#2563eb',
	pink: '#db2777',
	yellow: '#ca8a04',
	green: '#059669',
	goldenrod: '#b45309',
};

export function getActiveRevisionColor(document: ScreenplayDocumentRecord): ScreenplayRevisionColor | null {
	if (!document.layout?.revisionModeActive) {
		return null;
	}

	const activeId = document.workspace?.activeRevisionSetId;
	const activeSet = document.workspace?.revisionSets?.find((set) => set.id === activeId);

	return activeSet?.color ?? document.layout.revisionColor ?? null;
}

export function getRevisionDotColor(color: ScreenplayRevisionColor): string {
	return REVISION_DOT_COLORS[color];
}
