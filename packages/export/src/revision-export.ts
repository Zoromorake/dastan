export interface PdfExportOptions {
	includeChangeMarks?: boolean;
	changeMarkBlockIndices?: number[];
	revisionMarkColor?: string;
	revisionHeader?: string;
	revisionHistoryLines?: string[];
	revisionBorderClass?: string;
}

const REVISION_MARK_COLORS: Record<string, string> = {
	blue: '#2563eb',
	pink: '#db2777',
	yellow: '#ca8a04',
	green: '#059669',
	goldenrod: '#b45309',
	white: '#64748b',
};

function revisionMarkColor(color: string | undefined): string {
	return REVISION_MARK_COLORS[color ?? ''] ?? '#64748b';
}

export function buildRevisionHistoryBoxHtml(lines: string[]): string {
	if (lines.length === 0) {
		return '';
	}

	const rows = lines.map((line) => `<li>${line}</li>`).join('');
	return `<div class="revision-history-box"><p class="revision-history-title">REVISION HISTORY</p><ul>${rows}</ul></div>`;
}

export { revisionMarkColor };
