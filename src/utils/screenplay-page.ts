import type { CSSProperties } from 'react';
import type { ScreenplayColorSetting, ScreenplayDocumentLayout } from '../types';
import { DEFAULT_PAGE_MARGINS, SCRIPT_PAGE_HEIGHT_PX, SCRIPT_PAGE_WIDTH_PX } from './screenplay-page-constants';

export {
	SCRIPT_PAGE_HEIGHT_PX,
	SCRIPT_PAGE_WIDTH_PX,
	DEFAULT_PAGE_MARGINS,
} from './screenplay-page-constants';

export function inchesToPx(inches: number): number {
	return Math.round(inches * 96);
}

export function getPageMarginStyle(layout: ScreenplayDocumentLayout): CSSProperties {
	const margins = layout.pageMargins;

	return {
		paddingTop: inchesToPx(margins.top),
		paddingRight: inchesToPx(DEFAULT_PAGE_MARGINS.right),
		paddingBottom: inchesToPx(margins.bottom),
		paddingLeft: inchesToPx(DEFAULT_PAGE_MARGINS.left),
	};
}

const colorMap: Record<Exclude<ScreenplayColorSetting, 'automatic'>, string> = {
	black: '#0f172a',
	blue: '#1d4ed8',
	red: '#dc2626',
	green: '#15803d',
	purple: '#7c3aed',
	orange: '#ea580c',
	gray: '#64748b',
};

const highlightMap: Record<Exclude<ScreenplayColorSetting, 'automatic'>, string> = {
	black: '#e2e8f0',
	blue: '#dbeafe',
	red: '#fee2e2',
	green: '#dcfce7',
	purple: '#ede9fe',
	orange: '#ffedd5',
	gray: '#f1f5f9',
};

export function resolveLayoutTextColor(setting: ScreenplayColorSetting, isDark: boolean): string | null {
	if (setting === 'automatic') {
		return isDark ? '#e2e8f0' : '#1c1917';
	}

	return colorMap[setting];
}

export function resolveLayoutBackgroundColor(
	setting: ScreenplayColorSetting,
	isDark: boolean,
): string | null {
	if (setting === 'automatic') {
		return null;
	}

	if (setting === 'black') {
		return isDark ? '#0f172a' : '#ffffff';
	}

	return highlightMap[setting] ?? (isDark ? '#1e293b' : '#ffffff');
}

export function resolveElementColor(setting: ScreenplayColorSetting, isDark: boolean): string | null {
	if (setting === 'automatic') {
		return null;
	}

	return colorMap[setting];
}

export function resolveElementHighlight(setting: ScreenplayColorSetting): string | null {
	if (setting === 'automatic') {
		return null;
	}

	return highlightMap[setting];
}

export const scriptPageSheetStyle = {
	width: SCRIPT_PAGE_WIDTH_PX,
	height: SCRIPT_PAGE_HEIGHT_PX,
} as const;
