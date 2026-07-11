/** Curated appliesWhen vocabulary with freeform escape hatch. */

export const APPLIES_WHEN_SCENE_TEXTURE = [
	'intimate',
	'action',
	'spectacle',
	'grounded',
	'impossible-scale',
] as const;

export const APPLIES_WHEN_CRAFT_MOMENT = [
	'midpoint',
	'opening',
	'climax',
	'dialogue-heavy',
	'quiet-beat',
] as const;

export const CURATED_APPLIES_WHEN = [
	...APPLIES_WHEN_SCENE_TEXTURE,
	...APPLIES_WHEN_CRAFT_MOMENT,
] as const;

export type CuratedAppliesWhen = (typeof CURATED_APPLIES_WHEN)[number];

export const APPLIES_WHEN_LABELS: Record<string, string> = {
	intimate: 'Intimate',
	action: 'Action',
	spectacle: 'Spectacle',
	grounded: 'Grounded / physical',
	'impossible-scale': 'Impossible scale',
	midpoint: 'Midpoint',
	opening: 'Opening',
	climax: 'Climax',
	'dialogue-heavy': 'Dialogue-heavy',
	'quiet-beat': 'Quiet beat',
};

export function labelAppliesWhen(tag: string): string {
	return APPLIES_WHEN_LABELS[tag] ?? tag;
}

export function normalizeAppliesWhenTag(raw: string): string {
	return raw.trim().toLowerCase().replace(/\s+/g, '-');
}
