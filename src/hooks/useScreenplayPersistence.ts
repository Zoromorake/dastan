import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { useScreenplayStore } from '../store';
import { normalizeDocumentLayout } from '../utils/screenplay-layout';
import { createEmptyDocumentContent, loadLastDocument, saveDocument, saveVersionSnapshot } from '../utils/screenplay-storage';
import { getEditorBlockType, setBlockType, splitToBlockType } from '../editor/commands';
import type { ScreenplayDocumentRecord } from '../types';

function createDocumentSnapshot(document: ScreenplayDocumentRecord, content: JSONContent): ScreenplayDocumentRecord {
	return {
		...document,
		updatedAt: new Date().toISOString(),
		content,
	};
}

export function useScreenplayPersistence() {
	const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
	const editorRef = useRef<Editor | null>(null);
	const loadedDocumentIdRef = useRef<string | null>(null);
	const saveTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
	const loadingRef = useRef(true);
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

		const snapshot = createDocumentSnapshot(currentDocument, editor.getJSON());

		await saveDocument(snapshot);
		await saveVersionSnapshot(snapshot);
		setDocument(snapshot);
		setSaveStatus('saved');
		loadedDocumentIdRef.current = snapshot.id;
	}, [setDocument, setSaveStatus]);

	const scheduleSave = useCallback(() => {
		const editor = editorRef.current;
		const currentDocument = useScreenplayStore.getState().currentDocument;

		if (!editor || !currentDocument) {
			return;
		}

		setDocumentContent(editor.getJSON());
		setSaveStatus('unsaved');

		if (saveTimerRef.current) {
			globalThis.clearTimeout(saveTimerRef.current);
		}

		saveTimerRef.current = globalThis.setTimeout(() => {
			void persistCurrentDocument();
		}, 2000);
	}, [persistCurrentDocument, setDocumentContent, setSaveStatus]);

	const forceSave = useCallback(async () => {
		if (saveTimerRef.current) {
			globalThis.clearTimeout(saveTimerRef.current);
			saveTimerRef.current = null;
		}

		await persistCurrentDocument();
	}, [persistCurrentDocument]);

	const registerEditor = useCallback((nextEditor: Editor | null) => {
		editorRef.current = nextEditor;
		setEditorInstance(nextEditor);
	}, []);

	useEffect(() => {
		let cancelled = false;

		void (async () => {
			const loadedDocument = await loadLastDocument();

			if (cancelled) {
				return;
			}

			setDocument(loadedDocument);
			setHydrated(true);
			setSaveStatus('saved');
			loadedDocumentIdRef.current = loadedDocument.id;
			loadingRef.current = false;

			const editor = editorRef.current;
			if (editor) {
				editor.commands.setContent(loadedDocument.content ?? createEmptyDocumentContent(), false);
			}
		})();

		return () => {
			cancelled = true;
			if (saveTimerRef.current) {
				globalThis.clearTimeout(saveTimerRef.current);
			}
		};
	}, [setDocument, setHydrated, setSaveStatus]);

	useEffect(() => {
		if (!editorInstance || !documentRecord) {
			return;
		}

		if (loadedDocumentIdRef.current === documentRecord.id) {
			return;
		}

		editorInstance.commands.setContent(documentRecord.content ?? createEmptyDocumentContent(), false);
		loadedDocumentIdRef.current = documentRecord.id;
	}, [documentRecord, editorInstance]);

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
				const currentBlockType = getEditorBlockType(editor);

				if (currentBlockType) {
					const layout = normalizeDocumentLayout(currentDocument.layout);
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
		isLoaded: !loadingRef.current,
		handleUpdate,
		queueSave: scheduleSave,
		handleKeyDown,
		registerEditor,
		forceSave,
		saveStatus,
	};
}
