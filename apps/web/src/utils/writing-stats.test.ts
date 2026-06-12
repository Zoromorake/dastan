import { beforeEach, describe, expect, it } from 'vitest';
import {
	createDefaultWritingStats,
	loadWritingStats,
	recordWordCountDelta,
	setDailyWordGoal,
	startWritingSession,
} from './writing-stats';

describe('writing stats', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('tracks positive word deltas', () => {
		const previous = { type: 'doc', content: [{ type: 'action', content: [{ type: 'text', text: 'one two' }] }] };
		const next = { type: 'doc', content: [{ type: 'action', content: [{ type: 'text', text: 'one two three four' }] }] };

		const stats = recordWordCountDelta(previous, next);
		expect(stats.todayWords).toBeGreaterThan(0);
		expect(stats.totalWordsWritten).toBeGreaterThan(0);
	});

	it('stores a daily goal', () => {
		const stats = setDailyWordGoal(750);
		expect(stats.dailyWordGoal).toBe(750);
		expect(loadWritingStats().dailyWordGoal).toBe(750);
	});

	it('starts a writing session timestamp', () => {
		const stats = startWritingSession();
		expect(stats.sessionStartAt).toBeTruthy();
		expect(createDefaultWritingStats().sessionStartAt).toBeNull();
	});
});
