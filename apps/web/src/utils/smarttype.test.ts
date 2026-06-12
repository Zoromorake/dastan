import { describe, expect, it } from 'vitest';
import { applySmartTypeSelection, collectSmartTypeLexicon, extractSmartTypeSuggestions } from './smarttype';

const sampleContent = {
	type: 'doc',
	content: [
		{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. OFFICE - DAY' }] },
		{ type: 'scene_heading', content: [{ type: 'text', text: 'EXT. BEACH - NIGHT' }] },
		{ type: 'character', content: [{ type: 'text', text: 'MARA' }] },
		{ type: 'character', content: [{ type: 'text', text: 'JAMES (V.O.)' }] },
		{ type: 'transition', content: [{ type: 'text', text: 'CUT TO:' }] },
	],
};

describe('smarttype suggestions', () => {
	it('suggests scene prefixes on an empty scene heading', () => {
		const result = extractSmartTypeSuggestions({ content: sampleContent }, '', 'scene_heading');

		expect(result.phase).toBe('prefix');
		expect(result.items.map((item) => item.value)).toEqual(['INT.', 'EXT.', 'INT./EXT.', 'EXT./INT.']);
		expect(result.sectionLabel).toBe('Scene setting');
	});

	it('suggests learned locations after the intro', () => {
		const result = extractSmartTypeSuggestions({ content: sampleContent }, 'INT. ', 'scene_heading');

		expect(result.phase).toBe('location');
		expect(result.items.map((item) => item.value)).toEqual(['BEACH', 'OFFICE']);
	});

	it('suggests times after the dash', () => {
		const result = extractSmartTypeSuggestions({ content: sampleContent }, 'INT. OFFICE - ', 'scene_heading');

		expect(result.phase).toBe('time');
		expect(result.items.map((item) => item.value)).toContain('DAY');
		expect(result.items.map((item) => item.value)).toContain('NIGHT');
	});

	it('suggests extensions after a complete character name', () => {
		const result = extractSmartTypeSuggestions({ content: sampleContent }, 'MARA', 'character');

		expect(result.phase).toBe('extension');
		expect(result.items.map((item) => item.value)).toContain('(V.O.)');
	});

	it('suggests transitions in a transition block', () => {
		const result = extractSmartTypeSuggestions({ content: sampleContent }, 'FA', 'transition');

		expect(result.phase).toBe('transition');
		expect(result.items.map((item) => item.value)).toContain('FADE IN:');
	});

	it('merges workspace profiles and respects exclusions', () => {
		const lexicon = collectSmartTypeLexicon({
			content: sampleContent,
			workspace: {
				globalNotes: '',
				sceneNotes: {},
				scriptNotes: [],
				development: {
					basics: { logline: '', synopsis: '', genre: '', actSummaries: ['', '', ''] },
					structureTemplate: 'save-the-cat',
					structureBeats: [],
					treatment: '',
					beatsViewMode: 'board',
				},
				beatBoard: [],
				characterProfiles: { TRISH: { name: 'TRISH' } },
				locationProfiles: {},
				smartTypeExclusions: { characters: ['MARA'] },
			},
		});

		expect(lexicon.characters).toContain('JAMES');
		expect(lexicon.characters).toContain('TRISH');
		expect(lexicon.characters).not.toContain('MARA');
	});

	it('applies contextual scene heading and extension completions', () => {
		expect(applySmartTypeSelection('scene_heading', '', 'INT.', 'prefix')).toBe('INT. ');
		expect(applySmartTypeSelection('scene_heading', 'INT. ', 'OFFICE', 'location')).toBe('INT. OFFICE - ');
		expect(applySmartTypeSelection('scene_heading', 'INT. OFFICE - ', 'NIGHT', 'time')).toBe('INT. OFFICE - NIGHT');
		expect(applySmartTypeSelection('character', 'MARA', '(V.O.)', 'extension')).toBe('MARA (V.O.)');
	});
});
