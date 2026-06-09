import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';

import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import Bold from '@tiptap/extension-bold';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Underline from '@tiptap/extension-underline';
import Text from '@tiptap/extension-text';
import {
	Action,
	Centered,
	Character,
	Dialogue,
	General,
	HighlightColor,
	Lyrics,
	Parenthetical,
	SceneHeading,
	ScreenplayDocument,
	ScreenplayKeymap,
	Shot,
	TextColor,
	Transition,
} from '../editor/extensions';
import { getCurrentBlockIndex, getEditorBlockType, setBlockType } from '../editor/commands';
import { useScreenplayPersistence } from '../hooks/useScreenplayPersistence';
import { useScreenplayStore } from '../store';
import type {
	ScreenplayBlockType,
	ScreenplayDocumentLayout,
	ScreenplayElementTypography,
	ScreenplayScriptNote,
	ScreenplayWorkspaceData,
	ScreenplayZoomLevel,
} from '../types';
import { normalizeWorkspaceData } from '../types';
import { computePageBreaks, groupBlocksByPage } from '../utils/page-breaks';
import { exportDocumentToPdf } from '../utils/pdf-export';
import { normalizeDocumentLayout } from '../utils/screenplay-layout';
import { ScriptPageChrome } from './ScriptPageChrome';
import {
	getPageMarginStyle,
	resolveLayoutBackgroundColor,
	resolveLayoutTextColor,
	scriptPageSheetStyle,
} from '../utils/screenplay-page';
import { SCRIPT_PAGE_HEIGHT_PX, SCRIPT_PAGE_WIDTH_PX } from '../utils/screenplay-page-constants';
import { buildElementTypographyCss } from '../utils/screenplay-typography-styles';
import {
	createDocument,
	createEmptyScreenplayContent,
	getActiveDocuments,
	saveDocument,
	setLastDocumentId,
	softDeleteDocument,
} from '../utils/screenplay-storage';
import {
	getSceneHeadingsFromContent,
	getScreenplayBlocksFromContent,
	isSupportedScreenplayImport,
	parseImportedScreenplayFile,
	parseImportedScreenplayPdfFile,
	toFountainScreenplay,
	toFinalDraftScreenplay,
	toPlainTextScreenplay,
} from '../utils/screenplay-text';
import { handleEditorSmartKeyboard, handleElementShortcut, type EditorKeyboardContext } from '../utils/editor-keyboard';
import { EmptyElementMenu } from './EmptyElementMenu';
import { applySmartTypeSelection, extractSmartTypeSuggestions } from '../utils/smarttype';
import type { SmartTypeBlockType, SmartTypeSuggestionItem } from '../utils/smarttype';
import { EditorFloatingToolbar } from './EditorFloatingToolbar';
import { ElementPicker } from './ElementPicker';
import { SceneNavigator } from './SceneNavigator';
import { ScriptNoteDialog } from './ScriptNoteDialog';
import { getEditorTheme } from '../utils/editor-theme';
import { ScreenplayWorkspacePanel, type WorkspaceTab } from './ScreenplayWorkspacePanel';
import { SmartTypeSuggestions } from './SmartTypeSuggestions';
import { EditorWorkspaceNav } from './EditorWorkspaceNav';
import { TitlePagePanel } from './TitlePagePanel';
import { TopBar } from './TopBar';
import type { SettingsTab, UserThemeSetting } from './UserSettingsPanel';
import { VersionHistoryDialog } from './VersionHistoryDialog';
import { WriterInspector } from './WriterInspector';
import { AiChatPanel } from './ai/AiChatPanel';

const screenplayExtensions = [
	ScreenplayDocument,
	Text,
	History,
	Bold,
	Italic,
	Underline,
	Strike,
	SceneHeading,
	Action,
	Character,
	Dialogue,
	Parenthetical,
	Transition,
	Centered,
	Shot,
	General,
	Lyrics,
	ScreenplayKeymap,
	TextColor,
	HighlightColor,
];

const blockTypeLabels: Record<ScreenplayBlockType, string> = {
	scene_heading: 'Scene Heading',
	action: 'Action',
	character: 'Character',
	dialogue: 'Dialogue',
	parenthetical: 'Parenthetical',
	transition: 'Transition',
	centered: 'Centered',
	shot: 'Shot',
	general: 'General',
	lyrics: 'Lyrics',
};

const zoomClassNames: Record<ScreenplayZoomLevel, string> = {
	90: 'scale-[0.9]',
	100: 'scale-100',
	110: 'scale-110',
	125: 'scale-125',
};

interface ScreenplayEditorProps {
	documentId?: string;
	onBackToHub?: () => void;
	theme: UserThemeSetting;
	resolvedTheme: 'light' | 'dark';
	onThemeChange: (theme: UserThemeSetting) => void;
}

export function ScreenplayEditor({ documentId, onBackToHub, theme, resolvedTheme, onThemeChange }: ScreenplayEditorProps) {
	const persistence = useScreenplayPersistence();
	const editorRef = useRef<Editor | null>(null);
	const sceneResetTimerRef = useRef<number | null>(null);
	const highlightedSceneElementRef = useRef<HTMLElement | null>(null);
	const [activeTab, setActiveTab] = useState<WorkspaceTab>('Script');
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [sidebarMode, setSidebarMode] = useState<'scenes' | 'projects'>('scenes');
	const [currentBlockType, setCurrentBlockType] = useState<ScreenplayBlockType | null>(null);
	const [editorHasFocus, setEditorHasFocus] = useState(false);
	const [inspectorCollapsed, setInspectorCollapsed] = useState(true);
	const [chatOpen, setChatOpen] = useState(false);
	const [settingsTabRequest, setSettingsTabRequest] = useState<SettingsTab | null>(null);
	const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
	const [scriptNoteOpen, setScriptNoteOpen] = useState(false);
	const [smartTypeQuery, setSmartTypeQuery] = useState('');
	const [smartTypeAnchorTop, setSmartTypeAnchorTop] = useState(0);
	const [smartTypeAnchorLeft, setSmartTypeAnchorLeft] = useState(0);
	const [smartTypeHighlightIndex, setSmartTypeHighlightIndex] = useState(0);
	const [emptyElementMenuOpen, setEmptyElementMenuOpen] = useState(false);
	const [emptyElementHighlightIndex, setEmptyElementHighlightIndex] = useState(0);
	const editorKeyboardContextRef = useRef<EditorKeyboardContext>({
		smartType: {
			blockType: null,
			query: '',
			suggestions: { phase: 'none', sectionLabel: 'Suggestions', items: [] },
			source: { content: null, workspace: null },
			highlightIndex: 0,
			onHighlightIndexChange: () => undefined,
		},
		emptyElementMenu: {
			open: false,
			highlightIndex: 0,
			onOpen: () => undefined,
			onClose: () => undefined,
			onHighlightIndexChange: () => undefined,
			onSelect: () => undefined,
		},
	});
	const isDark = resolvedTheme === 'dark';
	const editorTheme = useMemo(() => getEditorTheme(isDark), [isDark]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'l') {
				return;
			}

			const target = event.target;

			if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
				return;
			}

			event.preventDefault();
			setChatOpen((current) => !current);
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, []);

	const currentDocument = useScreenplayStore((state) => state.currentDocument);
	const documentList = useScreenplayStore((state) => state.documentList);
	const isHydrated = useScreenplayStore((state) => state.isHydrated);
	const saveStatus = useScreenplayStore((state) => state.saveStatus);
	const focusMode = useScreenplayStore((state) => state.focusMode);
	const setDocumentTitle = useScreenplayStore((state) => state.setDocumentTitle);
	const setDocumentLayout = useScreenplayStore((state) => state.setDocumentLayout);
	const setDocumentWorkspace = useScreenplayStore((state) => state.setDocumentWorkspace);
	const setCurrentDocument = useScreenplayStore((state) => state.setCurrentDocument);
	const setDocumentList = useScreenplayStore((state) => state.setDocumentList);
	const setFocusMode = useScreenplayStore((state) => state.setFocusMode);
	const switchDocument = useScreenplayStore((state) => state.switchDocument);

	const documentLayout = useMemo(
		() => normalizeDocumentLayout(currentDocument?.layout),
		[currentDocument?.layout],
	);

	const documentWorkspace = useMemo(
		() => normalizeWorkspaceData(currentDocument?.workspace),
		[currentDocument?.workspace],
	);

	const updateEditorOverlayState = useCallback((selectionEditor: Editor) => {
		const blockType = getEditorBlockType(selectionEditor);
		const parentElement = selectionEditor.view.dom.parentElement;

		if (parentElement) {
			const parentRect = parentElement.getBoundingClientRect();
			const coords = selectionEditor.view.coordsAtPos(selectionEditor.state.selection.from);
			setSmartTypeAnchorTop(coords.bottom - parentRect.top + 6);
			setSmartTypeAnchorLeft(coords.left - parentRect.left);
		}

		if (blockType === 'character' || blockType === 'scene_heading' || blockType === 'transition') {
			setSmartTypeQuery(selectionEditor.state.selection.$from.parent.textContent);
			return;
		}

		setSmartTypeQuery('');
	}, []);

	const handleEditorKeyDown = useCallback(
		(view: unknown, event: KeyboardEvent) => {
			const activeEditor = editorRef.current;

			if (activeEditor && handleEditorSmartKeyboard(activeEditor, event, editorKeyboardContextRef.current)) {
				return true;
			}

			return persistence.handleKeyDown(view, event);
		},
		[persistence],
	);

	const editor = useEditor({
		extensions: screenplayExtensions,
		content: createEmptyScreenplayContent(),
		autofocus: 'end',
		editorProps: {
			attributes: {
				class: 'focus:outline-none space-y-3 text-stone-900 font-mono',
				style: 'color: #1c1917; font-family: Courier Prime, Courier New, Courier, monospace;',
				spellcheck: 'true',
			},
			handleKeyDown: handleEditorKeyDown,
		},
		onCreate: ({ editor: createdEditor }) => {
			editorRef.current = createdEditor;
		},
		onUpdate: ({ editor: updatedEditor }) => {
			persistence.handleUpdate();
			updateEditorOverlayState(updatedEditor);
		},
		onSelectionUpdate: ({ editor: selectionEditor }) => {
			setCurrentBlockType(getEditorBlockType(selectionEditor));
			updateEditorOverlayState(selectionEditor);
		},
		onFocus: () => {
			setEditorHasFocus(true);
		},
		onBlur: () => {
			setEditorHasFocus(false);
			setEmptyElementMenuOpen(false);
		},
	});

	useEffect(() => {
		persistence.registerEditor(editor);
		return () => {
			persistence.registerEditor(null);
		};
	}, [editor, persistence]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const activeEditor = editorRef.current;

			if (!activeEditor?.isFocused) {
				return;
			}

			if (handleElementShortcut(activeEditor, event)) {
				event.stopImmediatePropagation();
			}
		};

		document.addEventListener('keydown', onKeyDown, true);
		return () => {
			document.removeEventListener('keydown', onKeyDown, true);
		};
	}, []);

	const pageMarginStyle = useMemo(() => getPageMarginStyle(documentLayout), [documentLayout]);

	const pageBackgroundStyle = useMemo(() => {
		const backgroundColor = resolveLayoutBackgroundColor(documentLayout.pageAppearance.backgroundColor, isDark);

		return backgroundColor ? { backgroundColor } : {};
	}, [documentLayout.pageAppearance.backgroundColor, isDark]);

	useEffect(() => {
		if (editor === null) {
			return;
		}

		const root = editor.view.dom;
		root.classList.toggle('script-editor--dark', isDark);
		root.classList.toggle('script-editor--scene-numbers', documentLayout.showSceneNumbers);
		const textColor = resolveLayoutTextColor(documentLayout.pageAppearance.textColor, isDark);
		root.style.color = textColor ?? (isDark ? '#e2e8f0' : '#1c1917');
	}, [documentLayout.pageAppearance.textColor, documentLayout.showSceneNumbers, editor, isDark]);

	useEffect(() => {
		const styleId = 'screenplay-element-typography';
		let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;

		if (!styleElement) {
			styleElement = document.createElement('style');
			styleElement.id = styleId;
			document.head.appendChild(styleElement);
		}

		styleElement.textContent = buildElementTypographyCss(documentLayout, isDark);

		return () => {
			styleElement?.remove();
		};
	}, [documentLayout, isDark]);

	useEffect(() => {
		const handleWindowKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
				event.preventDefault();
				setSidebarCollapsed((currentValue) => !currentValue);
			}
		};

		window.addEventListener('keydown', handleWindowKeyDown);
		return () => {
			window.removeEventListener('keydown', handleWindowKeyDown);
		};
	}, []);

	const refreshDocumentList = useCallback(async () => {
		const documents = await getActiveDocuments();
		setDocumentList(documents);
		return documents;
	}, [setDocumentList]);

	useEffect(() => {
		if (!isHydrated) {
			return;
		}

		void refreshDocumentList();
	}, [isHydrated, refreshDocumentList]);

	useEffect(() => {
		if (!isHydrated || !documentId) {
			return;
		}

		if (currentDocument?.id === documentId) {
			return;
		}

		void (async () => {
			await persistence.forceSave();
			const documents = await refreshDocumentList();

			if (!documents.some((document) => document.id === documentId)) {
				return;
			}

			switchDocument(documentId);
			await setLastDocumentId(documentId);
			setSidebarMode('scenes');
		})();
	}, [currentDocument?.id, documentId, isHydrated, persistence, refreshDocumentList, switchDocument]);

	useEffect(() => {
		return () => {
			if (sceneResetTimerRef.current !== null) {
				window.clearTimeout(sceneResetTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (documentLayout.pageViewMode !== 'paged' || editor === null) {
			return;
		}

		const editorDom = editor.view.dom;
		const breaks = new Set(computePageBreaks(currentDocument?.content ?? null).map((segment) => segment.blockIndex));
		const blockNodes = editorDom.querySelectorAll<HTMLElement>('[data-block-type]');

		blockNodes.forEach((node, index) => {
			if (breaks.has(index)) {
				node.classList.add('screenplay-page-break-before');
			} else {
				node.classList.remove('screenplay-page-break-before');
			}
		});
	}, [currentDocument?.content, documentLayout.pageViewMode, editor]);

	const pagedPageCount = useMemo(() => {
		if (currentDocument === null) {
			return 1;
		}

		return Math.max(1, groupBlocksByPage(currentDocument.content).length);
	}, [currentDocument]);

	const smartTypeSource = useMemo(
		() => ({
			content: currentDocument?.content ?? null,
			workspace: documentWorkspace,
		}),
		[currentDocument?.content, documentWorkspace],
	);

	const smartTypeBlockType: SmartTypeBlockType | null =
		currentBlockType === 'character' || currentBlockType === 'scene_heading' || currentBlockType === 'transition'
			? currentBlockType
			: null;

	const smartTypeSuggestions = useMemo(
		() => extractSmartTypeSuggestions(smartTypeSource, smartTypeQuery, smartTypeBlockType),
		[smartTypeBlockType, smartTypeQuery, smartTypeSource],
	);

	useEffect(() => {
		setSmartTypeHighlightIndex(0);
	}, [smartTypeSuggestions]);

	const handleOpenEmptyElementMenu = useCallback(() => {
		setEmptyElementHighlightIndex(0);
		setEmptyElementMenuOpen(true);
	}, []);

	useEffect(() => {
		editorKeyboardContextRef.current = {
			smartType: {
				blockType: currentBlockType,
				query: smartTypeQuery,
				suggestions: smartTypeSuggestions,
				source: smartTypeSource,
				highlightIndex: smartTypeHighlightIndex,
				onHighlightIndexChange: setSmartTypeHighlightIndex,
			},
			emptyElementMenu: {
				open: emptyElementMenuOpen,
				highlightIndex: emptyElementHighlightIndex,
				onOpen: handleOpenEmptyElementMenu,
				onClose: () => setEmptyElementMenuOpen(false),
				onHighlightIndexChange: setEmptyElementHighlightIndex,
				onSelect: (blockType) => {
					setScriptBlockType(blockType);
				},
			},
		};
	}, [
		currentBlockType,
		emptyElementHighlightIndex,
		emptyElementMenuOpen,
		handleOpenEmptyElementMenu,
		smartTypeHighlightIndex,
		smartTypeQuery,
		smartTypeSource,
		smartTypeSuggestions,
	]);

	const showSmartType =
		editorHasFocus && !emptyElementMenuOpen && smartTypeBlockType !== null && smartTypeSuggestions.items.length > 0;

	const revisionClassName =
		documentLayout.revisionColor !== 'none' ? `revision-${documentLayout.revisionColor}` : '';

	const sceneHeadings = useMemo(() => {
		if (currentDocument === null) {
			return [];
		}

		return getSceneHeadingsFromContent(currentDocument.content);
	}, [currentDocument]);

	const screenplayBlocks = useMemo(() => {
		if (currentDocument === null) {
			return [];
		}

		return getScreenplayBlocksFromContent(currentDocument.content);
	}, [currentDocument]);

	useEffect(() => {
		if (activeTab !== 'Script') {
			return;
		}

		const focusTimer = window.setTimeout(() => {
			editor?.chain().focus('end').run();
		}, 0);

		return () => {
			window.clearTimeout(focusTimer);
		};
	}, [activeTab, currentDocument?.id, editor]);

	const scrollToScene = useCallback((sceneIndex: number) => {
		setActiveTab('Script');

		const highlightScene = () => {
			const editorDom = editorRef.current?.view.dom;
			if (!editorDom) {
				return false;
			}

			const sceneNodes = editorDom.querySelectorAll<HTMLElement>('[data-block-type="scene_heading"]');
			const targetSceneNode = sceneNodes.item(sceneIndex);

			if (!targetSceneNode) {
				return false;
			}

			const highlightClasses = editorTheme.sceneHighlight;

			if (highlightedSceneElementRef.current !== null) {
				highlightedSceneElementRef.current.classList.remove(...highlightClasses);
			}

			targetSceneNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
			targetSceneNode.classList.add(...highlightClasses);
			highlightedSceneElementRef.current = targetSceneNode;

			if (sceneResetTimerRef.current !== null) {
				window.clearTimeout(sceneResetTimerRef.current);
			}

			sceneResetTimerRef.current = window.setTimeout(() => {
				targetSceneNode.classList.remove(...highlightClasses);
				if (highlightedSceneElementRef.current === targetSceneNode) {
					highlightedSceneElementRef.current = null;
				}
			}, 1200);

			return true;
		};

		window.requestAnimationFrame(() => {
			if (highlightScene()) {
				return;
			}

			window.setTimeout(() => {
				highlightScene();
			}, 0);
		});
	}, [editorTheme.sceneHighlight]);

	const handleTitleChange = useCallback(
		(nextTitle: string) => {
			setDocumentTitle(nextTitle);
			void persistence.queueSave();
		},
		[persistence, setDocumentTitle],
	);

	const handleLayoutChange = useCallback(
		(layout: Partial<ScreenplayDocumentLayout>) => {
			setDocumentLayout(layout);
			void persistence.queueSave();
		},
		[persistence, setDocumentLayout],
	);

	const handleWorkspaceChange = useCallback(
		(workspace: Partial<ScreenplayWorkspaceData>) => {
			setDocumentWorkspace(workspace);
			void persistence.queueSave();
		},
		[persistence, setDocumentWorkspace],
	);

	const handleElementBehaviorChange = useCallback(
		(blockType: ScreenplayBlockType, field: 'enterTarget' | 'tabTarget', value: ScreenplayBlockType) => {
			setDocumentLayout({
				elementSettings: {
					...documentLayout.elementSettings,
					[blockType]: {
						...documentLayout.elementSettings[blockType],
						behavior: {
							...documentLayout.elementSettings[blockType].behavior,
							[field]: value,
						},
					},
				},
			});
			void persistence.queueSave();
		},
		[documentLayout.elementSettings, persistence, setDocumentLayout],
	);

	const handleElementTypographyChange = useCallback(
		(blockType: ScreenplayBlockType, typography: Partial<ScreenplayElementTypography>) => {
			setDocumentLayout({
				elementSettings: {
					...documentLayout.elementSettings,
					[blockType]: {
						...documentLayout.elementSettings[blockType],
						typography: {
							...documentLayout.elementSettings[blockType].typography,
							...typography,
						},
					},
				},
			});
			void persistence.queueSave();
		},
		[documentLayout.elementSettings, persistence, setDocumentLayout],
	);

	const handleExport = useCallback(
		(format: 'fountain' | 'text' | 'fdx' | 'pdf') => {
			if (currentDocument === null) {
				return;
			}

			if (format === 'pdf') {
				try {
					exportDocumentToPdf(currentDocument);
				} catch (error) {
					const message = error instanceof Error ? error.message : 'Could not export PDF.';
					window.alert(message);
				}
				return;
			}

			const extension = format === 'fountain' ? 'fountain' : format === 'fdx' ? 'fdx' : 'txt';
			const source =
				format === 'fountain'
					? toFountainScreenplay(currentDocument.content)
					: format === 'fdx'
						? toFinalDraftScreenplay(currentDocument.content, currentDocument.title)
						: toPlainTextScreenplay(currentDocument.content);
			const safeTitle = (currentDocument.title.trim() || 'Untitled').replace(/[\\/:*?"<>|]+/g, '_');

			const mimeType = format === 'fdx' ? 'application/xml;charset=utf-8' : 'text/plain;charset=utf-8';
			const blob = new Blob([source], { type: mimeType });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');

			link.href = url;
			link.download = `${safeTitle}.${extension}`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		},
		[currentDocument],
	);

	const handleImport = useCallback(
		async (file: File) => {
			if (!isSupportedScreenplayImport(file.name)) {
				window.alert('Unsupported file type. Import supports .fountain, .fdx, .txt, and .pdf files.');
				return;
			}

			const baseTitle = file.name.replace(/\.[^.]+$/u, '').trim() || 'Untitled';
			const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

			let parsedContent;

			try {
				if (extension === 'pdf') {
					const sourceBuffer = await file.arrayBuffer();
					parsedContent = await parseImportedScreenplayPdfFile(sourceBuffer);
				} else {
					const sourceText = await file.text();
					parsedContent = parseImportedScreenplayFile(file.name, sourceText);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Could not parse this file.';
				window.alert(`${message} Try exporting it as .fdx or .fountain and importing again.`);
				return;
			}

			await persistence.forceSave();

			const createdDocument = await createDocument(baseTitle);
			const importedDocument = {
				...createdDocument,
				title: baseTitle,
				updatedAt: new Date().toISOString(),
				content: parsedContent,
			};

			await saveDocument(importedDocument);
			setCurrentDocument(importedDocument);
			await refreshDocumentList();
			setSidebarMode('scenes');
			editor?.chain().focus('end').run();
		},
		[editor, persistence, refreshDocumentList, setCurrentDocument],
	);

	const handleDocumentCreate = useCallback(async () => {
		await persistence.forceSave();
		const createdDocument = await createDocument('Untitled');
		const documents = await refreshDocumentList();
		setCurrentDocument(createdDocument);
		setSidebarMode('scenes');

		if (!documents.some((document) => document.id === createdDocument.id)) {
			setDocumentList([createdDocument, ...documents]);
		}

		editor?.chain().focus('end').run();
	}, [editor, persistence, refreshDocumentList, setCurrentDocument, setDocumentList]);

	const handleDocumentSelect = useCallback(
		async (id: string) => {
			if (currentDocument?.id === id) {
				setSidebarMode('scenes');
				editor?.chain().focus('end').run();
				return;
			}

			await persistence.forceSave();
			const documents = await refreshDocumentList();

			if (!documents.some((document) => document.id === id)) {
				return;
			}

			switchDocument(id);
			await setLastDocumentId(id);
			setSidebarMode('scenes');
			editor?.chain().focus('end').run();
		},
		[currentDocument?.id, editor, persistence, refreshDocumentList, switchDocument],
	);

	const handleDocumentDelete = useCallback(
		async (id: string) => {
			const documentToDelete = documentList.find((document) => document.id === id);
			const label = documentToDelete?.title || 'Untitled';

			if (!window.confirm(`Delete script "${label}"?`)) {
				return;
			}

			const deletingCurrent = currentDocument?.id === id;
			await softDeleteDocument(id);
			const documents = await refreshDocumentList();

			if (documents.length === 0) {
				return;
			}

			if (deletingCurrent) {
				setCurrentDocument(documents[0]);
				await setLastDocumentId(documents[0].id);
			}
		},
		[currentDocument?.id, documentList, refreshDocumentList, setCurrentDocument],
	);

	const handleSmartTypeSelect = useCallback(
		(item: SmartTypeSuggestionItem) => {
			if (!editor || smartTypeBlockType === null) {
				return;
			}

			const nextText = applySmartTypeSelection(smartTypeBlockType, smartTypeQuery, item.value, item.group);
			const $from = editor.state.selection.$from;
			const start = $from.start();
			const end = $from.end();

			editor.chain().focus().deleteRange({ from: start, to: end }).insertContentAt(start, nextText).run();
		},
		[editor, smartTypeBlockType, smartTypeQuery],
	);

	const handleVersionRestored = useCallback(async () => {
		const documents = await refreshDocumentList();
		const restoredDocument = documents.find((document) => document.id === currentDocument?.id);

		if (restoredDocument) {
			setCurrentDocument(restoredDocument);
		}
	}, [currentDocument?.id, refreshDocumentList, setCurrentDocument]);

	const setScriptBlockType = useCallback(
		(blockType: ScreenplayBlockType) => {
			if (!editor) {
				return;
			}

			editor.chain().focus().setNode(blockType).run();
		},
		[editor],
	);

	const toggleBold = useCallback(() => {
		editor?.chain().focus().toggleBold().run();
	}, [editor]);

	const toggleItalic = useCallback(() => {
		editor?.chain().focus().toggleItalic().run();
	}, [editor]);

	const toggleUnderline = useCallback(() => {
		editor?.chain().focus().toggleUnderline().run();
	}, [editor]);

	const toggleStrike = useCallback(() => {
		editor?.chain().focus().toggleStrike().run();
	}, [editor]);

	const handleUndo = useCallback(() => {
		editor?.chain().focus().undo().run();
	}, [editor]);

	const handleRedo = useCallback(() => {
		editor?.chain().focus().redo().run();
	}, [editor]);

	const currentBlockIndex = editor ? getCurrentBlockIndex(editor) : 0;
	const currentScriptNote = useMemo(
		() => documentWorkspace.scriptNotes.find((note) => note.blockIndex === currentBlockIndex) ?? null,
		[documentWorkspace.scriptNotes, currentBlockIndex],
	);

	const handleSaveScriptNote = useCallback(
		(body: string) => {
			if (!editor) {
				return;
			}

			const blockIndex = getCurrentBlockIndex(editor);
			const now = new Date().toISOString();
			let nextNotes: ScreenplayScriptNote[];

			if (body.length === 0) {
				nextNotes = documentWorkspace.scriptNotes.filter((note) => note.blockIndex !== blockIndex);
			} else {
				const existingNote = documentWorkspace.scriptNotes.find((note) => note.blockIndex === blockIndex);

				if (existingNote) {
					nextNotes = documentWorkspace.scriptNotes.map((note) =>
						note.blockIndex === blockIndex ? { ...note, body, updatedAt: now } : note,
					);
				} else {
					nextNotes = [
						...documentWorkspace.scriptNotes,
						{
							id: crypto.randomUUID(),
							blockIndex,
							body,
							createdAt: now,
							updatedAt: now,
						},
					];
				}
			}

			handleWorkspaceChange({ scriptNotes: nextNotes });
			setScriptNoteOpen(false);
		},
		[documentWorkspace.scriptNotes, editor, handleWorkspaceChange],
	);

	const handleDeleteScriptNote = useCallback(() => {
		if (!editor) {
			return;
		}

		const blockIndex = getCurrentBlockIndex(editor);
		handleWorkspaceChange({
			scriptNotes: documentWorkspace.scriptNotes.filter((note) => note.blockIndex !== blockIndex),
		});
		setScriptNoteOpen(false);
	}, [documentWorkspace.scriptNotes, editor, handleWorkspaceChange]);

	useEffect(() => {
		if (editor === null) {
			return;
		}

		const blockNodes = editor.view.dom.querySelectorAll<HTMLElement>('[data-block-type]');
		const notedIndexes = new Set(documentWorkspace.scriptNotes.map((note) => note.blockIndex));

		blockNodes.forEach((node, index) => {
			if (notedIndexes.has(index)) {
				node.setAttribute('data-has-script-note', 'true');
			} else {
				node.removeAttribute('data-has-script-note');
			}
		});
	}, [currentDocument?.content, documentWorkspace.scriptNotes, editor]);

	const handleTitlePageChange = useCallback(
		(titlePage: Partial<typeof documentLayout.titlePage>) => {
			handleLayoutChange({
				titlePage: {
					...documentLayout.titlePage,
					...titlePage,
				},
			});
		},
		[documentLayout.titlePage, handleLayoutChange],
	);

	const renderTitlePageContent = documentLayout.showTitlePage ? (
		<TitlePagePanel
			titlePage={documentLayout.titlePage}
			documentTitle={currentDocument?.title ?? ''}
			authorName={documentLayout.authorName}
			isDark={isDark}
			onChange={handleTitlePageChange}
		/>
	) : null;

	const renderTitlePageSheet = documentLayout.showTitlePage ? (
		<div
			className={`script-page-sheet ${editorTheme.scriptPage} ${isDark ? 'script-page--dark' : ''}`}
			style={{ ...scriptPageSheetStyle, ...pageBackgroundStyle }}
			onMouseDown={() => {
				editor?.chain().focus().run();
			}}
		>
			<div className="script-page-sheet__body" style={pageMarginStyle}>
				{renderTitlePageContent}
			</div>
		</div>
	) : null;

	const renderEditorSurface = (
		<div className={`relative ${revisionClassName}`}>
			<div className="relative">
				<EditorContent editor={editor} className="min-h-[820px] focus:outline-none" spellCheck />
				{emptyElementMenuOpen && editorHasFocus ? (
					<EmptyElementMenu
						anchorTop={smartTypeAnchorTop}
						anchorLeft={smartTypeAnchorLeft}
						highlightIndex={emptyElementHighlightIndex}
						isDark={isDark}
						labels={blockTypeLabels}
						onHighlightIndexChange={setEmptyElementHighlightIndex}
						onSelect={(blockType) => {
							setScriptBlockType(blockType);
							setEmptyElementMenuOpen(false);
						}}
					/>
				) : null}
				{showSmartType ? (
					<SmartTypeSuggestions
						suggestions={smartTypeSuggestions}
						anchorTop={smartTypeAnchorTop}
						anchorLeft={smartTypeAnchorLeft}
						highlightIndex={smartTypeHighlightIndex}
						isDark={isDark}
						onSelect={handleSmartTypeSelect}
						onHighlightIndexChange={setSmartTypeHighlightIndex}
					/>
				) : null}
			</div>
		</div>
	);

	const renderScriptBodySheet = (className = '') => (
		<div
			className={`script-page-sheet ${editorTheme.scriptPage} ${isDark ? 'script-page--dark' : ''} ${className}`}
			style={{ width: SCRIPT_PAGE_WIDTH_PX, minHeight: SCRIPT_PAGE_HEIGHT_PX, ...pageBackgroundStyle }}
			onMouseDown={() => {
				editor?.chain().focus().run();
			}}
		>
			<ScriptPageChrome
				documentTitle={currentDocument?.title ?? ''}
				isDark={isDark}
				layout={documentLayout}
				pageNumber={1}
				scriptPageIndex={0}
			/>
			<div className="script-page-sheet__body" style={pageMarginStyle}>
				{renderEditorSurface}
			</div>
		</div>
	);

	const renderContinuousPage = (
		<div className="flex flex-col gap-8">
			{renderTitlePageSheet}
			{renderScriptBodySheet()}
		</div>
	);

	const renderPagedView = (
		<div className="flex flex-col gap-8" style={{ width: SCRIPT_PAGE_WIDTH_PX }}>
			{renderTitlePageSheet}

			<div
				className="relative"
				style={{ width: SCRIPT_PAGE_WIDTH_PX }}
				onMouseDown={() => {
					editor?.chain().focus().run();
				}}
			>
				<div className="pointer-events-none absolute inset-0 z-0 flex flex-col gap-8">
					{Array.from({ length: pagedPageCount }, (_, pageIndex) => {
						const pageNumber = pageIndex + 1;

						return (
							<div
								key={pageNumber}
								className="relative"
								style={{ width: SCRIPT_PAGE_WIDTH_PX, height: SCRIPT_PAGE_HEIGHT_PX }}
							>
								<div
									className={editorTheme.scriptPage}
									style={{ width: SCRIPT_PAGE_WIDTH_PX, height: SCRIPT_PAGE_HEIGHT_PX, ...pageBackgroundStyle }}
								/>
								<ScriptPageChrome
									documentTitle={currentDocument?.title ?? ''}
									isDark={isDark}
									layout={documentLayout}
									pageNumber={pageNumber}
									scriptPageIndex={pageIndex}
								/>
							</div>
						);
					})}
				</div>

				<div className="relative z-10" style={pageMarginStyle}>
					{renderEditorSurface}
				</div>
			</div>
		</div>
	);

	if (!isHydrated || editor === null || currentDocument === null) {
		return <div className={`h-screen overflow-hidden ${editorTheme.shell}`} />;
	}

	return (
		<div className={`flex h-screen flex-col overflow-hidden ${editorTheme.shell}`}>
			<TopBar
				theme={theme}
				resolvedTheme={resolvedTheme}
				onThemeChange={onThemeChange}
				saveStatus={saveStatus}
				title={currentDocument.title}
				onTitleChange={handleTitleChange}
				focusMode={focusMode}
				documentId={currentDocument.id}
				onBackToHub={onBackToHub}
				onNewDocument={() => {
					void handleDocumentCreate();
				}}
				onImport={(file) => {
					void handleImport(file);
				}}
				onExport={handleExport}
				onToggleFocusMode={() => setFocusMode(!focusMode)}
				onOpenVersionHistory={() => setVersionHistoryOpen(true)}
				activeWorkspaceTab={activeTab}
				onWorkspaceTabChange={setActiveTab}
				settingsTabRequest={settingsTabRequest}
				onSettingsTabRequestHandled={() => setSettingsTabRequest(null)}
			/>

			{!focusMode ? (
				<div className={`flex h-11 shrink-0 items-center border-b px-3 md:hidden ${editorTheme.tabBar}`}>
					<EditorWorkspaceNav
						activeTab={activeTab}
						resolvedTheme={resolvedTheme}
						onTabChange={setActiveTab}
					/>
				</div>
			) : null}

			{activeTab === 'Script' && !focusMode ? (
				<div className={`relative z-50 flex h-11 shrink-0 items-center overflow-visible border-b px-4 ${editorTheme.tabBar}`}>
					<div className="pointer-events-none absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 overflow-visible">
						<div className="pointer-events-auto overflow-visible">
							<ElementPicker
								isDark={isDark}
								labels={blockTypeLabels}
								value={currentBlockType ?? 'action'}
								onChange={(blockType) => {
									if (editor) {
										setScriptBlockType(blockType);
									}
								}}
							/>
						</div>
					</div>
					<button
						className={`ml-auto shrink-0 ${chatOpen ? editorTheme.chatToggleActive : editorTheme.chatToggle}`}
						type="button"
						title="AI Chat (⌘L)"
						onClick={() => setChatOpen((currentValue) => !currentValue)}
					>
						<MessageSquare size={14} />
						Chat
					</button>
				</div>
			) : null}
			<div className="relative z-0 flex min-h-0 flex-1 overflow-hidden">
				{!focusMode ? (
					<SceneNavigator
						collapsed={sidebarCollapsed}
						mode={sidebarMode}
						scenes={sceneHeadings}
						documentList={documentList}
						currentDocumentId={currentDocument.id}
						resolvedTheme={resolvedTheme}
						onModeChange={setSidebarMode}
						onDocumentSelect={(id) => {
							void handleDocumentSelect(id);
						}}
						onDocumentCreate={() => {
							void handleDocumentCreate();
						}}
						onDocumentDelete={(id) => {
							void handleDocumentDelete(id);
						}}
						onToggleCollapsed={() => setSidebarCollapsed((currentValue) => !currentValue)}
						onSceneSelect={scrollToScene}
					/>
				) : null}

				<main className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${editorTheme.main}`}>
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						<div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-8 py-8">
							<div className="relative w-full" style={{ maxWidth: SCRIPT_PAGE_WIDTH_PX }}>
								{activeTab === 'Script' ? (
									<div
										className={`mx-auto origin-top transition-transform duration-150 ${zoomClassNames[documentLayout.zoomLevel]} ${isDark ? 'script-page--dark' : ''}`}
									>
										{documentLayout.pageViewMode === 'paged' ? renderPagedView : renderContinuousPage}
									</div>
								) : (
									<div className="mx-auto w-full max-w-5xl px-2 py-6 sm:py-8">
										<ScreenplayWorkspacePanel
											activeTab={activeTab}
											scenes={sceneHeadings}
											blocks={screenplayBlocks}
											workspace={documentWorkspace}
											resolvedTheme={resolvedTheme}
											onWorkspaceChange={handleWorkspaceChange}
											onSceneSelect={scrollToScene}
										/>
									</div>
								)}
							</div>
						</div>
					</div>

					{!focusMode && activeTab === 'Script' ? (
						<WriterInspector
							activeBlockType={currentBlockType}
							documentContent={currentDocument?.content ?? null}
							documentTitle={currentDocument.title}
							documentLayout={documentLayout}
							documentWorkspace={documentWorkspace}
							resolvedTheme={resolvedTheme}
							collapsed={inspectorCollapsed}
							onToggleCollapsed={() => setInspectorCollapsed((currentValue) => !currentValue)}
							onTitleChange={handleTitleChange}
							onLayoutChange={handleLayoutChange}
							onElementBehaviorChange={handleElementBehaviorChange}
							onElementTypographyChange={handleElementTypographyChange}
							onBlockTypeChange={setScriptBlockType}
							onWorkspaceChange={handleWorkspaceChange}
						/>
					) : null}
				</main>
			</div>

			{!focusMode && editor ? (
				<EditorFloatingToolbar
					editor={editor}
					currentBlockType={currentBlockType}
					blockTypeLabels={blockTypeLabels}
					isDark={isDark}
					floatingBarClass={editorTheme.floatingBar}
					floatingBtnClass={editorTheme.floatingBtn}
					floatingBtnActiveClass={editorTheme.floatingBtnActive}
					floatingDividerClass={editorTheme.floatingDivider}
					onSetBlockType={setScriptBlockType}
					onToggleBold={toggleBold}
					onToggleItalic={toggleItalic}
					onToggleUnderline={toggleUnderline}
					onToggleStrike={toggleStrike}
					onUndo={handleUndo}
					onRedo={handleRedo}
					onOpenScriptNote={() => setScriptNoteOpen(true)}
				/>
			) : null}

			<ScriptNoteDialog
				open={scriptNoteOpen}
				blockIndex={currentBlockIndex}
				blockLabel={currentBlockType ? blockTypeLabels[currentBlockType] : 'Block'}
				existingNote={currentScriptNote}
				isDark={isDark}
				onClose={() => setScriptNoteOpen(false)}
				onSave={handleSaveScriptNote}
				onDelete={handleDeleteScriptNote}
			/>

			<VersionHistoryDialog
				open={versionHistoryOpen}
				documentId={currentDocument.id}
				onClose={() => setVersionHistoryOpen(false)}
				onRestored={() => {
					void handleVersionRestored();
				}}
			/>

			{!focusMode && activeTab === 'Script' ? (
				<AiChatPanel
					open={chatOpen}
					documentId={currentDocument.id}
					documentTitle={currentDocument.title}
					documentContent={currentDocument.content}
					workspace={documentWorkspace}
					resolvedTheme={resolvedTheme}
					onClose={() => setChatOpen(false)}
					onOpenSettings={() => {
						setChatOpen(false);
						setSettingsTabRequest('ai');
					}}
				/>
			) : null}
		</div>
	);
}
