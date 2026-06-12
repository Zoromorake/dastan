import type { ScreenplayDocumentLayout } from '../types';
import { SCREENPLAY_BLOCK_TYPES } from '../types';
import { resolveElementColor, resolveElementHighlight } from './screenplay-page';

const fontFamilyMap = {
	'courier-prime': "'Courier Prime', 'Courier New', Courier, monospace",
	'courier-new': "'Courier New', Courier, monospace",
} as const;

export function buildElementTypographyCss(layout: ScreenplayDocumentLayout, isDark: boolean): string {
	const rules = SCREENPLAY_BLOCK_TYPES.map((blockType) => {
		const typography = layout.elementSettings[blockType].typography;
		const declarations: string[] = [];

		declarations.push(`font-family: ${fontFamilyMap[typography.fontFamily]};`);
		declarations.push(`font-size: ${typography.fontSize}pt;`);

		const color = resolveElementColor(typography.color, isDark);
		if (color) {
			declarations.push(`color: ${color};`);
		}

		const highlight = resolveElementHighlight(typography.highlight);
		if (highlight) {
			declarations.push(`background-color: ${highlight};`);
		}

		if (typography.bold) {
			declarations.push('font-weight: 700;');
		}

		if (typography.italic) {
			declarations.push('font-style: italic;');
		}

		const decorations: string[] = [];
		if (typography.underline) {
			decorations.push('underline');
		}
		if (typography.strikethrough) {
			decorations.push('line-through');
		}
		declarations.push(`text-decoration: ${decorations.length > 0 ? decorations.join(' ') : 'none'};`);

		if (typography.capitalization === 'uppercase') {
			declarations.push('text-transform: uppercase;');
		} else if (typography.capitalization === 'lowercase') {
			declarations.push('text-transform: lowercase;');
		} else {
			declarations.push('text-transform: none;');
		}

		return `.ProseMirror [data-block-type="${blockType}"] { ${declarations.join(' ')} }`;
	});

	return rules.join('\n');
}
