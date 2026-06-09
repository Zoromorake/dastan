import type { ScreenplayDocumentRecord } from '../types';

const recentStorageKey = 'dastan.recent-documents';

export function recordRecentDocument(documentId: string, limit = 15): void {
	if (typeof window === 'undefined') {
		return;
	}

	const existing = getRecentDocumentIds();
	const next = [documentId, ...existing.filter((id) => id !== documentId)].slice(0, limit);
	window.localStorage.setItem(recentStorageKey, JSON.stringify(next));
}

export function getRecentDocumentIds(): string[] {
	if (typeof window === 'undefined') {
		return [];
	}

	const raw = window.localStorage.getItem(recentStorageKey);

	if (!raw) {
		return [];
	}

	try {
		const parsed = JSON.parse(raw) as unknown;

		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter((value): value is string => typeof value === 'string');
	} catch {
		return [];
	}
}

export function getRecentDocuments(documents: ScreenplayDocumentRecord[], limit = 15): ScreenplayDocumentRecord[] {
	const recentIds = getRecentDocumentIds();
	const activeDocuments = documents.filter((document) => !document.deletedAt);
	const byId = new Map(activeDocuments.map((document) => [document.id, document]));

	const ordered = recentIds
		.map((id) => byId.get(id))
		.filter((document): document is ScreenplayDocumentRecord => document !== undefined);

	if (ordered.length >= limit) {
		return ordered.slice(0, limit);
	}

	const remaining = activeDocuments
		.filter((document) => !recentIds.includes(document.id))
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

	return [...ordered, ...remaining].slice(0, limit);
}
