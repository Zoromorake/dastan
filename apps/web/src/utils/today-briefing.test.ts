import { describe, expect, it } from 'vitest';
import { createDefaultWorkspaceData } from '../types';
import { createDefaultWritingStats } from './writing-stats';
import { buildTodayBriefing, getSceneHeadingAtBlockIndex } from './today-briefing';

describe('today-briefing', () => {
	it('builds factual lines from local data', () => {
		const workspace = createDefaultWorkspaceData();
		workspace.development.structureBeats = [
			{
				id: '1',
				key: 'setup',
				label: 'Set-up',
				pageHint: '1–10%',
				summary: 'Hero wants out.',
				order: 0,
			},
			{
				id: '2',
				key: 'catalyst',
				label: 'Catalyst',
				pageHint: '10%',
				summary: '',
				order: 1,
			},
		];

		const result = buildTodayBriefing({
			document: {
				id: 'doc',
				title: 'Lunar',
				updatedAt: new Date().toISOString(),
				content: {
					type: 'doc',
					content: [
						{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. LAB - NIGHT' }] },
						{ type: 'action', content: [{ type: 'text', text: 'Work continues.' }] },
					],
				},
				workspace,
				lastCursorBlockIndex: 1,
			},
			sessionStats: {
				documentId: 'doc',
				lastSessionDate: new Date().toISOString().slice(0, 10),
				wordsAdded: 250,
				pagesAdded: 1,
				baselineWordCount: 0,
			},
			writingStats: { ...createDefaultWritingStats(), streakDays: 3 },
			yesterdayPages: 2,
		});

		expect(result.activeSceneHeading).toBe('INT. LAB - NIGHT');
		expect(result.lines.some((line) => line.includes('scene 1 of LUNAR'))).toBe(true);
		expect(result.lines.some((line) => line.includes('unlinked'))).toBe(true);
		expect(result.lines.some((line) => line.includes('Yesterday: 2 pages'))).toBe(true);
	});

	it('finds the nearest scene heading for non-heading blocks', () => {
		const heading = getSceneHeadingAtBlockIndex(
			{
				type: 'doc',
				content: [
					{ type: 'scene_heading', content: [{ type: 'text', text: 'EXT. ROOF - DAY' }] },
					{ type: 'action', content: [{ type: 'text', text: 'Wind.' }] },
				],
			},
			1,
		);

		expect(heading).toBe('EXT. ROOF - DAY');
	});
});
