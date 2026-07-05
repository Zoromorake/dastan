import { describe, expect, it } from 'vitest';
import { buildCharacterReport, buildLocationReport, buildSceneReport } from './production-reports';

const sampleContent = {
	type: 'doc',
	content: [
		{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. KITCHEN - DAY' }] },
		{ type: 'character', content: [{ type: 'text', text: 'ALEX' }] },
		{ type: 'dialogue', content: [{ type: 'text', text: 'Hello there.' }] },
		{ type: 'scene_heading', attrs: { omitted: true }, content: [{ type: 'text', text: 'EXT. PARK - NIGHT' }] },
		{ type: 'action', content: [{ type: 'text', text: 'Should not count.' }] },
	],
};

describe('production reports', () => {
	it('builds scene report with metadata', () => {
		const rows = buildSceneReport(sampleContent);

		expect(rows).toHaveLength(2);
		expect(rows[0]?.intExt).toBe('INT.');
		expect(rows[0]?.characters).toContain('ALEX');
		expect(rows[1]?.omitted).toBe(true);
	});

	it('excludes omitted scenes from character and location reports', () => {
		const characters = buildCharacterReport(sampleContent);
		const locations = buildLocationReport(sampleContent);

		expect(characters.find((row) => row.name === 'ALEX')?.sceneCount).toBe(1);
		expect(locations.some((row) => row.location.includes('PARK'))).toBe(false);
	});
});
