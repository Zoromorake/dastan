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
	sessionWordGoal: number;
	sessionPageGoal: number;
	sprintEndsAt: string | null;
	sprintStartWords: number;
	lastSessionSummary: string | null;
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
		sessionWordGoal: 250,
		sessionPageGoal: 1,
		sprintEndsAt: null,
		sprintStartWords: 0,
		lastSessionSummary: null,
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

// Streak increments exactly once per calendar day on first write. Subsequent writes same day are no-ops for streak.
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

	// After rolloverDay() has been called, stats.todayDate === today is always true.
	// We need to know if this is a NEW day's first write (lastActiveDate < today).
	const isFirstWriteToday = stats.lastActiveDate !== today;
	const wroteYesterday = stats.lastActiveDate === yesterdayKey();

	let nextStreakDays = stats.streakDays;
	if (isFirstWriteToday) {
		// Either extend the streak (wrote yesterday) or reset to 1 (missed a day)
		nextStreakDays = wroteYesterday ? stats.streakDays + 1 : 1;
	}
	// If lastActiveDate === today, keep streakDays unchanged — already counted this day

	const next: WritingStatsState = {
		...stats,
		todayWords: nextTodayWords,
		todayDate: today,
		streakDays: nextStreakDays,
		lastActiveDate: today,
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

export function startWritingSprint(minutes: number): WritingStatsState {
	const stats = startWritingSession();
	const next = {
		...stats,
		sprintEndsAt: new Date(Date.now() + minutes * 60_000).toISOString(),
		sprintStartWords: stats.todayWords,
	};
	saveWritingStats(next);
	return next;
}

export function endWritingSprint(currentWords: number): WritingStatsState {
	const stats = loadWritingStats();
	const wordsAdded = Math.max(0, currentWords - stats.sprintStartWords);
	const minutes = stats.sessionStartAt
		? Math.max(1, Math.round((Date.now() - new Date(stats.sessionStartAt).getTime()) / 60_000))
		: 0;
	const pagesAdded = Number((wordsAdded / 250).toFixed(1));
	const next = {
		...stats,
		sprintEndsAt: null,
		sessionStartAt: null,
		lastSessionSummary: `${wordsAdded} words · ~${pagesAdded} pages · ${minutes} min`,
	};
	saveWritingStats(next);
	return next;
}

export function getSprintRemainingMinutes(stats: WritingStatsState): number {
	if (!stats.sprintEndsAt) {
		return 0;
	}

	const remainingMs = new Date(stats.sprintEndsAt).getTime() - Date.now();
	return Math.max(0, Math.ceil(remainingMs / 60_000));
}

export function setSessionGoals(wordGoal: number, pageGoal: number): WritingStatsState {
	const stats = loadWritingStats();
	const next = {
		...stats,
		sessionWordGoal: Math.max(50, Math.round(wordGoal)),
		sessionPageGoal: Math.max(0.25, Number(pageGoal.toFixed(2))),
	};
	saveWritingStats(next);
	return next;
}
