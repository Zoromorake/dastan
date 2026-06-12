import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createDebouncedSaveScheduler,
	createDocumentSnapshot,
	prepareDocumentPersist,
	resolveDocumentHydration,
	shouldApplyLoadedDocument,
} from './screenplay-persistence';
import type { ScreenplayDocumentRecord } from '@dastan/screenplay-model';

function makeDocument(overrides: Partial<ScreenplayDocumentRecord> = {}): ScreenplayDocumentRecord {
	return {
		id: 'doc-1',
		title: 'Untitled',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		layout: {} as ScreenplayDocumentRecord['layout'],
		workspace: {} as ScreenplayDocumentRecord['workspace'],
		content: { type: 'doc', content: [] },
		...overrides,
	};
}

describe('screenplay persistence helpers', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('creates a snapshot with updated content and timestamp', () => {
		const document = makeDocument();
		const nextContent = {
			type: 'doc',
			content: [{ type: 'action', content: [{ type: 'text', text: 'Updated' }] }],
		};

		const snapshot = createDocumentSnapshot(document, nextContent);

		expect(snapshot.content).toEqual(nextContent);
		expect(snapshot.updatedAt).not.toBe(document.updatedAt);
	});

	it('prepares persist payload from editor content', () => {
		const document = makeDocument();
		const previousContent = document.content;
		const nextContent = {
			type: 'doc',
			content: [{ type: 'action', content: [{ type: 'text', text: 'More words added here' }] }],
		};

		const result = prepareDocumentPersist({
			currentDocument: document,
			content: nextContent,
			previousContent,
		});

		expect(result.snapshot.content).toEqual(nextContent);
		expect(result.nextContent).toEqual(nextContent);
		expect(result.wordDeltaRecorded).toBe(true);
	});

	it('resolves hydration for missing and ready documents', () => {
		expect(resolveDocumentHydration(null)).toEqual({ status: 'missing', document: null });
		expect(resolveDocumentHydration(makeDocument()).status).toBe('ready');
	});

	it('skips editor content sync when the loaded id already matches', () => {
		expect(shouldApplyLoadedDocument('doc-1', 'doc-1')).toBe(false);
		expect(shouldApplyLoadedDocument('doc-1', 'doc-2')).toBe(true);
	});

	it('debounces saves and supports forced flush', async () => {
		const onSave = vi.fn();
		const scheduler = createDebouncedSaveScheduler(onSave, 2000);

		scheduler.schedule();
		scheduler.schedule();

		expect(onSave).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(2000);
		expect(onSave).toHaveBeenCalledTimes(1);

		scheduler.schedule();
		await scheduler.flush();
		expect(onSave).toHaveBeenCalledTimes(2);
	});
});
