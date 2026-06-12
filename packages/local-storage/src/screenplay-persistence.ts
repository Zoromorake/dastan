import type { JSONContent } from '@tiptap/core';
import type { ScreenplayDocumentRecord } from '@dastan/screenplay-model';

export const SCREENPLAY_SAVE_DEBOUNCE_MS = 2000;

export function createDocumentSnapshot(document: ScreenplayDocumentRecord, content: JSONContent): ScreenplayDocumentRecord {
	return {
		...document,
		updatedAt: new Date().toISOString(),
		content,
	};
}

export function shouldApplyLoadedDocument(currentLoadedId: string | null, nextDocumentId: string): boolean {
	return currentLoadedId !== nextDocumentId;
}

export function resolveDocumentHydration(loadedDocument: ScreenplayDocumentRecord | null | undefined): {
	status: 'missing' | 'ready';
	document: ScreenplayDocumentRecord | null;
} {
	if (!loadedDocument) {
		return { status: 'missing', document: null };
	}

	return { status: 'ready', document: loadedDocument };
}

export interface PersistEditorDocumentInput {
	currentDocument: ScreenplayDocumentRecord;
	content: JSONContent;
	previousContent: JSONContent | null;
}

export interface PersistEditorDocumentResult {
	snapshot: ScreenplayDocumentRecord;
	nextContent: JSONContent;
	wordDeltaRecorded: boolean;
}

export function prepareDocumentPersist({
	currentDocument,
	content,
	previousContent,
}: PersistEditorDocumentInput): PersistEditorDocumentResult {
	const snapshot = createDocumentSnapshot(currentDocument, content);

	return {
		snapshot,
		nextContent: content,
		wordDeltaRecorded: previousContent !== null,
	};
}

export function createDebouncedSaveScheduler(
	onSave: () => void | Promise<void>,
	delayMs = SCREENPLAY_SAVE_DEBOUNCE_MS,
): {
	schedule: () => void;
	cancel: () => void;
	flush: () => Promise<void>;
} {
	let timer: ReturnType<typeof globalThis.setTimeout> | null = null;

	const cancel = () => {
		if (timer) {
			globalThis.clearTimeout(timer);
			timer = null;
		}
	};

	const flush = async () => {
		cancel();
		await onSave();
	};

	const schedule = () => {
		if (timer) {
			globalThis.clearTimeout(timer);
		}

		timer = globalThis.setTimeout(() => {
			timer = null;
			void onSave();
		}, delayMs);
	};

	return { schedule, cancel, flush };
}
