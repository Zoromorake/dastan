export const CHARACTER_HIGHLIGHT_PALETTE = [
	'#2563eb',
	'#db2777',
	'#059669',
	'#d97706',
	'#7c3aed',
	'#0891b2',
	'#dc2626',
	'#4f46e5',
] as const;

export const STRUCTURE_LINE_PALETTE = [
	'#6366f1',
	'#ec4899',
	'#14b8a6',
	'#f59e0b',
	'#8b5cf6',
	'#06b6d4',
] as const;

export function getCharacterHighlightColor(name: string, overrides: Record<string, string> = {}): string {
	const normalized = name.trim().toUpperCase();

	if (overrides[normalized]) {
		return overrides[normalized];
	}

	let hash = 0;

	for (let index = 0; index < normalized.length; index += 1) {
		hash = (hash + normalized.charCodeAt(index) * (index + 1)) % CHARACTER_HIGHLIGHT_PALETTE.length;
	}

	return CHARACTER_HIGHLIGHT_PALETTE[hash] ?? CHARACTER_HIGHLIGHT_PALETTE[0];
}

export function getStructureLineColor(order: number): string {
	return STRUCTURE_LINE_PALETTE[order % STRUCTURE_LINE_PALETTE.length] ?? STRUCTURE_LINE_PALETTE[0];
}
