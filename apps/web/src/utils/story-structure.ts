import type { StructureBeat, StructureTemplate } from '../types';

export interface StructureBeatTemplate {
	key: string;
	label: string;
	pageHint: string;
}

const SAVE_THE_CAT_BEATS: StructureBeatTemplate[] = [
	{ key: 'opening-image', label: 'Opening Image', pageHint: '1%' },
	{ key: 'theme-stated', label: 'Theme Stated', pageHint: '5%' },
	{ key: 'setup', label: 'Set-up', pageHint: '1–10%' },
	{ key: 'catalyst', label: 'Catalyst', pageHint: '10%' },
	{ key: 'debate', label: 'Debate', pageHint: '10–25%' },
	{ key: 'break-into-two', label: 'Break into Two', pageHint: '25%' },
	{ key: 'b-story', label: 'B Story', pageHint: '30%' },
	{ key: 'fun-and-games', label: 'Fun and Games', pageHint: '30–55%' },
	{ key: 'midpoint', label: 'Midpoint', pageHint: '50%' },
	{ key: 'bad-guys-close-in', label: 'Bad Guys Close In', pageHint: '55–75%' },
	{ key: 'all-is-lost', label: 'All Is Lost', pageHint: '75%' },
	{ key: 'dark-night', label: 'Dark Night of the Soul', pageHint: '75–85%' },
	{ key: 'break-into-three', label: 'Break into Three', pageHint: '85%' },
	{ key: 'finale', label: 'Finale', pageHint: '85–100%' },
	{ key: 'final-image', label: 'Final Image', pageHint: '100%' },
];

const THREE_ACT_BEATS: StructureBeatTemplate[] = [
	{ key: 'act-one-setup', label: 'Act I — Setup', pageHint: '1–25%' },
	{ key: 'inciting-incident', label: 'Inciting Incident', pageHint: '~10%' },
	{ key: 'act-one-break', label: 'Act I Break', pageHint: '25%' },
	{ key: 'act-two-confrontation', label: 'Act II — Confrontation', pageHint: '25–75%' },
	{ key: 'midpoint', label: 'Midpoint', pageHint: '50%' },
	{ key: 'act-two-low', label: 'All Is Lost', pageHint: '75%' },
	{ key: 'act-three-resolution', label: 'Act III — Resolution', pageHint: '75–100%' },
	{ key: 'climax', label: 'Climax', pageHint: '~90%' },
];

export const STRUCTURE_TEMPLATE_LABELS: Record<StructureTemplate, string> = {
	'save-the-cat': 'Save the Cat (15 beats)',
	'three-act': 'Three-act structure',
	blank: 'Blank / custom',
};

export function getStructureBeatTemplates(template: StructureTemplate): StructureBeatTemplate[] {
	switch (template) {
		case 'save-the-cat':
			return SAVE_THE_CAT_BEATS;
		case 'three-act':
			return THREE_ACT_BEATS;
		case 'blank':
			return [];
	}
}

export function createStructureBeatsFromTemplate(template: StructureTemplate): StructureBeat[] {
	return getStructureBeatTemplates(template).map((beat, order) => ({
		id: crypto.randomUUID(),
		key: beat.key,
		label: beat.label,
		pageHint: beat.pageHint,
		summary: '',
		order,
	}));
}

export function mergeStructureBeatsWithTemplate(
	existing: StructureBeat[],
	template: StructureTemplate,
): StructureBeat[] {
	const templates = getStructureBeatTemplates(template);

	if (templates.length === 0) {
		return existing.length > 0 ? existing : [createBlankStructureBeat(0)];
	}

	const byKey = new Map(existing.map((beat) => [beat.key, beat]));

	return templates.map((templateBeat, order) => {
		const prior = byKey.get(templateBeat.key);

		if (prior) {
			return { ...prior, label: templateBeat.label, pageHint: templateBeat.pageHint, order };
		}

		return {
			id: crypto.randomUUID(),
			key: templateBeat.key,
			label: templateBeat.label,
			pageHint: templateBeat.pageHint,
			summary: '',
			order,
		};
	});
}

export function createBlankStructureBeat(order: number): StructureBeat {
	return {
		id: crypto.randomUUID(),
		key: `beat-${order}`,
		label: `Beat ${order + 1}`,
		pageHint: '',
		summary: '',
		order,
	};
}
