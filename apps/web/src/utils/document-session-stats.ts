import type { JSONContent } from '@tiptap/core';
import { countWordsFromContent } from './screenplay-text';

const STORAGE_KEY = 'dastan.document-session-stats';

export interface DocumentSessionStats {
	documentId: string;
	lastSessionDate: string;
	wordsAdded: number;
	pagesAdded: number;
	baselineWordCount: number;
}

interface SessionStatsStore {
	byDocument: Record<string, DocumentSessionStats>;
	dailyTotals: Record<string, { words: number; pages: number }>;
}

function todayKey(): string {
	return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
	const date = new Date();
	date.setDate(date.getDate() - 1);
	return date.toISOString().slice(0, 10);
}

function wordsToPages(words: number): number {
	return Number((words / 250).toFixed(1));
}

function loadStore(): SessionStatsStore {
	if (typeof window === 'undefined') {
		return { byDocument: {}, dailyTotals: {} };
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);

		if (!raw) {
			return { byDocument: {}, dailyTotals: {} };
		}

		return JSON.parse(raw) as SessionStatsStore;
	} catch {
		return { byDocument: {}, dailyTotals: {} };
	}
}

function saveStore(store: SessionStatsStore): void {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getDocumentSessionStats(documentId: string): DocumentSessionStats | null {
	return loadStore().byDocument[documentId] ?? null;
}

export function recordDocumentSessionDelta(
	documentId: string,
	previousContent: JSONContent | null,
	nextContent: JSONContent | null,
): DocumentSessionStats | null {
	const previousWords = countWordsFromContent(previousContent);
	const nextWords = countWordsFromContent(nextContent);
	const delta = Math.max(0, nextWords - previousWords);

	if (delta === 0) {
		return getDocumentSessionStats(documentId);
	}

	const store = loadStore();
	const today = todayKey();
	const existing = store.byDocument[documentId];
	const baseline = existing?.lastSessionDate === today ? existing.baselineWordCount : previousWords;
	const wordsAdded = Math.max(0, nextWords - baseline);
	const pagesAdded = wordsToPages(wordsAdded);

	const nextStats: DocumentSessionStats = {
		documentId,
		lastSessionDate: today,
		wordsAdded,
		pagesAdded,
		baselineWordCount: baseline,
	};

	store.byDocument[documentId] = nextStats;

	const daily = store.dailyTotals[today] ?? { words: 0, pages: 0 };
	store.dailyTotals[today] = {
		words: daily.words + delta,
		pages: Number((daily.pages + wordsToPages(delta)).toFixed(1)),
	};

	saveStore(store);
	return nextStats;
}

export function getYesterdayPageTotal(): number {
	const store = loadStore();
	return store.dailyTotals[yesterdayKey()]?.pages ?? 0;
}
