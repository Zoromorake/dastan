import { describe, expect, it } from 'vitest';
import {
	analyzeStructureCoverage,
	autoMapStructureBeatsToScenes,
	buildStructureCoveragePrompt,
} from './structure-coverage';
import { createStructureBeatsFromTemplate } from './story-structure';

describe('structure-coverage', () => {
	it('maps beats proportionally across scenes', () => {
		const beats = createStructureBeatsFromTemplate('three-act').slice(0, 4);
		const scenes = [
			{ index: 0, text: 'INT. HOUSE - DAY' },
			{ index: 5, text: 'EXT. STREET - NIGHT' },
			{ index: 10, text: 'INT. OFFICE - DAY' },
			{ index: 15, text: 'EXT. ROOFTOP - DUSK' },
		];

		const mapped = autoMapStructureBeatsToScenes(beats, scenes);

		expect(mapped[0]?.linkedSceneIndex).toBe(0);
		expect(mapped[3]?.linkedSceneIndex).toBe(15);
	});

	it('flags empty beats and unlinked scenes', () => {
		const beats = createStructureBeatsFromTemplate('three-act').slice(0, 3);
		const scenes = [{ index: 2, text: 'INT. KITCHEN - MORNING' }];

		const report = analyzeStructureCoverage(beats, scenes);

		expect(report.totalBeats).toBe(3);
		expect(report.filledBeats).toBe(0);
		expect(report.issues.some((issue) => issue.kind === 'empty-summary')).toBe(true);
		expect(report.issues.some((issue) => issue.kind === 'unlinked-scene')).toBe(true);
	});

	it('builds an AI prompt from the coverage report', () => {
		const beats = [{ ...createStructureBeatsFromTemplate('three-act')[0]!, summary: 'Hero intro' }];
		const report = analyzeStructureCoverage(beats, []);

		expect(buildStructureCoveragePrompt(report)).toContain('Coverage score');
		expect(buildStructureCoveragePrompt(report)).toContain('Which beats are missing');
	});
});
