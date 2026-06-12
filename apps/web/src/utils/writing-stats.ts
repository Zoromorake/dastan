import type { JSONContent } from '@tiptap/core';
import { countWordsFromContent } from './screenplay-text';

const STORAGE_KEY = 'dastan.writing-stats';

export interface WritingStatsState {
	dailyWordGoal: number;
	todayWords: number;
	todayDate: string;
	streakDays: number;
	lastActiveDate: string;
	totalWordsWritten: number;
	sessionStartAt: string | null;
}

function todayKey(): string {
	return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
	const date = new Date();
	date.setDate(date.getDate() - 1);
	return date.toISOString().slice(0, 10);
}

export function createDefaultWritingStats(): WritingStatsState {
	const today = todayKey();

	return {
		dailyWordGoal: 500,
		todayWords: 0,
		todayDate: today,
		streakDays: 0,
		lastActiveDate: today,
		totalWordsWritten: 0,
		sessionStartAt: null,
	};
}

export function loadWritingStats(): WritingStatsState {
	if (typeof window === 'undefined') {
		return createDefaultWritingStats();
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);

		if (!raw) {
			return createDefaultWritingStats();
		}

		return { ...createDefaultWritingStats(), ...JSON.parse(raw) } as WritingStatsState;
	} catch {
		return createDefaultWritingStats();
	}
}

function saveWritingStats(stats: WritingStatsState): void {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function rolloverDay(stats: WritingStatsState): WritingStatsState {
	const today = todayKey();

	if (stats.todayDate === today) {
		return stats;
	}

	const continuedStreak = stats.lastActiveDate === yesterdayKey();
	const nextStreak = continuedStreak ? stats.streakDays : 0;

	return {
		...stats,
		todayWords: 0,
		todayDate: today,
		streakDays: nextStreak,
	};
}

export function setDailyWordGoal(goal: number): WritingStatsState {
	const stats = rolloverDay(loadWritingStats());
	const next = { ...stats, dailyWordGoal: Math.max(50, Math.round(goal)) };
	saveWritingStats(next);
	return next;
}

export function startWritingSession(): WritingStatsState {
	const stats = rolloverDay(loadWritingStats());

	if (stats.sessionStartAt) {
		return stats;
	}

	const next = { ...stats, sessionStartAt: new Date().toISOString() };
	saveWritingStats(next);
	return next;
}

export function endWritingSession(): WritingStatsState {
	const stats = loadWritingStats();
	const next = { ...stats, sessionStartAt: null };
	saveWritingStats(next);
	return next;
}

export function recordWordCountDelta(previousContent: JSONContent | null, nextContent: JSONContent | null): WritingStatsState {
	const stats = rolloverDay(loadWritingStats());
	const previousWords = countWordsFromContent(previousContent);
	const nextWords = countWordsFromContent(nextContent);
	const delta = Math.max(0, nextWords - previousWords);

	if (delta === 0) {
		return stats;
	}

	const today = todayKey();
	const nextTodayWords = stats.todayWords + delta;
	const nextStreak = stats.lastActiveDate === today || stats.lastActiveDate === yesterdayKey()
		? Math.max(stats.streakDays, stats.lastActiveDate === today ? stats.streakDays : stats.streakDays + 1)
		: 1;

	const next: WritingStatsState = {
		...stats,
		todayWords: nextTodayWords,
		todayDate: today,
		lastActiveDate: today,
		streakDays: stats.lastActiveDate === today ? stats.streakDays : nextStreak,
		totalWordsWritten: stats.totalWordsWritten + delta,
	};

	saveWritingStats(next);
	return next;
}

export function getSessionMinutes(stats: WritingStatsState): number {
	if (!stats.sessionStartAt) {
		return 0;
	}

	const started = new Date(stats.sessionStartAt).getTime();
	const elapsed = Date.now() - started;
	return Math.max(0, Math.round(elapsed / 60_000));
}
