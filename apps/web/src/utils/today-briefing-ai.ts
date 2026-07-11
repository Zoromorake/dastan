import type { ScreenplayDocumentRecord } from '../types';
import { loadAiSettings } from './ai-settings';
import { hasAnyProviderConfigured } from './ai-models';

const CACHE_PREFIX = 'dastan.today-ai.';

function cacheKey(documentId: string): string {
	return `${CACHE_PREFIX}${documentId}.${new Date().toISOString().slice(0, 10)}`;
}

export function loadCachedTodayAiLine(documentId: string): string | null {
	try {
		return window.localStorage.getItem(cacheKey(documentId));
	} catch {
		return null;
	}
}

export function saveCachedTodayAiLine(documentId: string, line: string): void {
	window.localStorage.setItem(cacheKey(documentId), line);
}

export function canRequestTodayAiLine(): boolean {
	const settings = loadAiSettings();
	return hasAnyProviderConfigured(settings);
}

export async function fetchTodayAiLine(input: {
	document: ScreenplayDocumentRecord;
	sceneHeading: string | null;
	nextBeatLabel: string | null;
}): Promise<string | null> {
	const cached = loadCachedTodayAiLine(input.document.id);

	if (cached) {
		return cached;
	}

	if (!canRequestTodayAiLine()) {
		return null;
	}

	const settings = loadAiSettings();
	const title = input.document.title || 'Untitled';
	const whereLeftOff = input.sceneHeading ? `last in ${input.sceneHeading}` : 'mid-draft';
	const nextBeat = input.nextBeatLabel ? ` Next open beat: ${input.nextBeatLabel}.` : '';

	const system = 'You write one short encouraging line for a screenwriter returning to their script. Respond with a single sentence only. No quotes, no emojis.';
	const user = `Script: ${title}. Writer left off ${whereLeftOff}.${nextBeat} Keep it under 20 words.`;

	try {
		const response = await fetch(settings.chatApiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: user },
				],
				provider: settings.defaultProvider,
				model: settings.defaultModel,
				apiKeys: settings.apiKeys,
				maxTokens: 60,
			}),
		});

		if (!response.ok) {
			return null;
		}

		const payload = (await response.json()) as { text?: string; content?: string };
		const line = (payload.text ?? payload.content ?? '').trim();

		if (line.length === 0) {
			return null;
		}

		saveCachedTodayAiLine(input.document.id, line);
		return line;
	} catch {
		return null;
	}
}
