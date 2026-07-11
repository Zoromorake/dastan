import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { useDastanApp } from '../context/DastanAppProvider';
import { useScreenplayStore } from '../store';
import { normalizeDocumentLayout } from '../utils/screenplay-layout';
import { isBlockRevisionLocked } from '../utils/revision-lock';
import {
	createDebouncedSaveScheduler,
	prepareDocumentPersist,
	resolveDocumentHydration,
} from '../utils/screenplay-persistence';
import { getCurrentBlockIndex, getEditorBlockType, setBlockType, splitToBlockType } from '../editor/commands';
import { recordWordCountDelta, startWritingSession } from '../utils/writing-stats';
import { loadTrackWritingStats } from '../utils/user-settings';
import { recordDocumentSessionDelta } from '../utils/document-session-stats';
import {
	discardEphemeralDocument,
	getEphemeralDocument,
	updateEphemeralDocument,
} from '../utils/ephemeral-documents';
import { shouldPersistEphemeralDocument } from '../utils/ephemeral-documents-policy';

export function useScreenplayPersistence(documentId: string | undefined) {
	const { storage } = useDastanApp();
	const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
	const editorRef = useRef<Editor | null>(null);
	const loadedDocumentIdRef = useRef<string | null>(null);
	const saveSchedulerRef = useRef<ReturnType<typeof createDebouncedSaveScheduler> | null>(null);
	const [isLoaded, setIsLoaded] = useState(false);
	const lastAutoSnapshotRef = useRef<number>(0);
	const saveCountSinceSnapshotRef = useRef(0);
	const AUTO_SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;
	const AUTO_SNAPSHOT_SAVE_INTERVAL = 20;
	const previousContentRef = useRef<JSONContent | null>(null);
	const setDocument = useScreenplayStore((state) => state.setCurrentDocument);
	const setDocumentContent = useScreenplayStore((state) => state.setDocumentContent);
	const setHydrated = useScreenplayStore((state) => state.setHydrated);
	const saveStatus = useScreenplayStore((state) => state.saveStatus);
	const setSaveStatus = useScreenplayStore((state) => state.setSaveStatus);
	const documentRecord = useScreenplayStore((state) => state.currentDocument);

	const persistCurrentDocument = useCallback(async () => {
		const editor = editorRef.current;
		const currentDocument = useScreenplayStore.getState().currentDocument;

		if (!editor || !currentDocument) {
			return;
		}

		setSaveStatus('saving');

		const nextContent = editor.getJSON();
		const blockIndex = getCurrentBlockIndex(editor);
		const { snapshot, nextContent: persistedContent } = prepareDocumentPersist({
			currentDocument,
			content: nextContent,
			previousContent: previousContentRef.current,
		});
		const snapshotWithCursor = {
			...snapshot,
			lastCursorBlockIndex: blockIndex,
		};

		if (loadTrackWritingStats()) {
			recordWordCountDelta(previousContentRef.current, persistedContent);
			recordDocumentSessionDelta(snapshotWithCursor.id, previousContentRef.current, persistedContent);
		}
		previousContentRef.current = persistedContent;

		const ephemeral = getEphemeralDocument(snapshotWithCursor.id);

		if (ephemeral) {
			updateEphemeralDocument(snapshotWithCursor);

			if (shouldPersistEphemeralDocument(snapshotWithCursor)) {
				await storage.documents.save(snapshotWithCursor);
				discardEphemeralDocument(snapshotWithCursor.id);
				setDocument(snapshotWithCursor);
				setSaveStatus('saved');
			} else {
				setDocument(snapshotWithCursor);
				setSaveStatus('unsaved');
			}

			loadedDocumentIdRef.current = snapshotWithCursor.id;
			return;
		}

		await storage.documents.save(snapshotWithCursor);
		setDocument(snapshotWithCursor);
		setSaveStatus('saved');
		loadedDocumentIdRef.current = snapshotWithCursor.id;

		saveCountSinceSnapshotRef.current += 1;
		const now = Date.now();
		const shouldSnapshot =
			saveCountSinceSnapshotRef.current >= AUTO_SNAPSHOT_SAVE_INTERVAL ||
			now - lastAutoSnapshotRef.current >= AUTO_SNAPSHOT_INTERVAL_MS;

		if (shouldSnapshot) {
			await storage.versions.saveSnapshot(snapshotWithCursor);
			lastAutoSnapshotRef.current = now;
			saveCountSinceSnapshotRef.current = 0;
		}
	}, [setDocument, setSaveStatus, storage]);

	useEffect(() => {
		const scheduler = createDebouncedSaveScheduler(() => persistCurrentDocument());
		saveSchedulerRef.current = scheduler;

		return () => {
			scheduler.cancel();
			saveSchedulerRef.current = null;
		};
	}, [persistCurrentDocument]);

	const scheduleSave = useCallback(() => {
		const editor = editorRef.current;
		const currentDocument = useScreenplayStore.getState().currentDocument;

		if (!editor || !currentDocument) {
			return;
		}

		setDocumentContent(editor.getJSON());
		setSaveStatus('unsaved');
		saveSchedulerRef.current?.schedule();
	}, [setDocumentContent, setSaveStatus]);

	const forceSave = useCallback(async () => {
		await saveSchedulerRef.current?.flush();
	}, []);

	const registerEditor = useCallback((nextEditor: Editor | null) => {
		editorRef.current = nextEditor;
		setEditorInstance(nextEditor);
	}, []);

	useEffect(() => {
		let cancelled = false;
		setIsLoaded(false);
		setHydrated(false);
		loadedDocumentIdRef.current = null;

		void (async () => {
			if (!documentId) {
				setHydrated(true);
				setIsLoaded(true);
				return;
			}

			const ephemeralDocument = getEphemeralDocument(documentId);
			const loadedDocument = ephemeralDocument ?? (await storage.documents.get(documentId));

			if (cancelled) {
				return;
			}

			const hydration = resolveDocumentHydration(loadedDocument);

			if (hydration.status === 'missing' || hydration.document === null) {
				setHydrated(true);
				setIsLoaded(true);
				return;
			}

			const documentToLoad = hydration.document;
			setDocument(documentToLoad);
			setSaveStatus('saved');
			loadedDocumentIdRef.current = documentToLoad.id;
			previousContentRef.current = documentToLoad.content ?? null;
			startWritingSession();

			const editor = editorRef.current;
			if (editor) {
				editor.commands.setContent(documentToLoad.content ?? storage.documents.createEmptyContent(), false);
			}

			setHydrated(true);
			setIsLoaded(true);
		})();

		return () => {
			cancelled = true;
			saveSchedulerRef.current?.cancel();
		};
	}, [documentId, setDocument, setHydrated, setSaveStatus, storage]);

	useEffect(() => {
		if (!editorInstance || !documentRecord) {
			return;
		}

		if (loadedDocumentIdRef.current === documentRecord.id) {
			return;
		}

		editorInstance.commands.setContent(documentRecord.content ?? storage.documents.createEmptyContent(), false);
		loadedDocumentIdRef.current = documentRecord.id;
		previousContentRef.current = documentRecord.content ?? null;
	}, [documentRecord, editorInstance, storage]);

	const handleUpdate = useCallback(() => {
		scheduleSave();
	}, [scheduleSave]);

	const handleKeyDown = useCallback(
		(_view: unknown, event: KeyboardEvent) => {
			const editor = editorRef.current;
			const currentDocument = useScreenplayStore.getState().currentDocument;

			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
				event.preventDefault();
				void forceSave();
				return true;
			}

			if ((event.metaKey || event.ctrlKey) && event.key === '.') {
				event.preventDefault();
				const currentFocusMode = useScreenplayStore.getState().focusMode;
				useScreenplayStore.getState().setFocusMode(!currentFocusMode);
				return true;
			}

			if (editor && currentDocument) {
				const layout = normalizeDocumentLayout(currentDocument.layout);
				const blockIndex = getCurrentBlockIndex(editor);

				if (
					isBlockRevisionLocked(
						blockIndex,
						currentDocument.content,
						layout.lockedPageCount,
						layout.revisionModeActive,
					)
				) {
					if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Enter') {
						event.preventDefault();
						return true;
					}
				}

				const currentBlockType = getEditorBlockType(editor);

				if (currentBlockType) {
					const behavior = layout.elementSettings[currentBlockType].behavior;

					if (event.key === 'Tab' && !event.shiftKey) {
						event.preventDefault();
						return setBlockType(editor, behavior.tabTarget);
					}

					if (event.key === 'Enter' && event.shiftKey) {
						if (behavior.shiftEnterTarget) {
							event.preventDefault();
							return splitToBlockType(editor, behavior.shiftEnterTarget);
						}

						return false;
					}

					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault();
						return splitToBlockType(editor, behavior.enterTarget);
					}
				}
			}

			return false;
		},
		[forceSave],
	);

	return {
		isLoaded,
		handleUpdate,
		queueSave: scheduleSave,
		handleKeyDown,
		registerEditor,
		forceSave,
		saveStatus,
	};
}
