import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';

import type { Editor, Extensions, JSONContent } from '@tiptap/core';
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
import { getCurrentBlockIndex, getEditorBlockType, replaceCurrentBlockText, setBlockType } from '../editor/commands';
import { EditorCommandProvider, type EditorCommands } from '../context/EditorCommandContext';
import { looksLikeScreenplayText, parseScreenplayInsertText } from '../utils/insert-screenplay-text';
import { alignDualDialogueColumns } from '../editor/dual-dialogue';
import { useScreenplayPersistence } from '../hooks/useScreenplayPersistence';
import { useDocumentCollaboration } from '../hooks/useDocumentCollaboration';
import { useScreenplayStore } from '../store';
import type {
	ScreenplayBlockType,
	ScreenplayDocumentLayout,
	ScreenplayElementTypography,
	ScreenplayScriptNote,
	ScreenplayWorkspaceData,
} from '../types';
import { normalizeScriptNote, normalizeWorkspaceData } from '../types';
import { computePageBreaks, groupBlocksByPage } from '../utils/page-breaks';
import { formatPageAndRuntime } from '../utils/runtime-estimate';
import { recordWordCountDelta, startWritingSession } from '../utils/writing-stats';
import { getSceneIndexForBlockIndex, moveSceneInContent, splitContentIntoSceneGroups } from '../utils/scene-reorder';
import { normalizeDocumentLayout } from '../utils/screenplay-layout';
import { loadTypewriterMode, setTypewriterMode } from '../utils/user-settings';
import { ScriptPageChrome } from './ScriptPageChrome';
import {
	getPageMarginStyle,
	resolveLayoutBackgroundColor,
	resolveLayoutTextColor,
	scriptPageSheetStyle,
	computePageFitScale,
	ZOOM_MULTIPLIERS,
} from '../utils/screenplay-page';
import { SCRIPT_PAGE_HEIGHT_PX, SCRIPT_PAGE_WIDTH_PX } from '../utils/screenplay-page-constants';
import { buildElementTypographyCss } from '../utils/screenplay-typography-styles';
import {
	createDocument,
	createEmptyScreenplayContent,
	getActiveDocuments,
	getProjectById,
	loadDocumentById,
	restoreVersionSnapshot,
	saveDocument,
	setLastDocumentId,
	softDeleteDocument,
} from '../utils/screenplay-storage';
import type { DevelopSubTab, WorldSubTab, WorkspaceMode } from '../types/workspace-navigation';
import {
	getSceneHeadingsFromContent,
	getScreenplayBlocksFromContent,
	isSupportedScreenplayImport,
	parseImportedScreenplayFile,
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
import { FindReplacePanel } from './FindReplacePanel';
import { EditorNavigator, type EditorNavigatorSection } from './EditorNavigator';
import { ScriptActionsMenu } from './ScriptActionsMenu';
import { ScriptNoteDialog } from './ScriptNoteDialog';
import { getEditorTheme } from '../utils/editor-theme';
import { ScreenplayWorkspacePanel } from './ScreenplayWorkspacePanel';
import { EditorWorkspaceSubNav } from './EditorWorkspaceSubNav';
import { SmartTypeSuggestions } from './SmartTypeSuggestions';
import { EditorWorkspaceNav } from './EditorWorkspaceNav';
import { TitlePagePanel } from './TitlePagePanel';
import { TopBar } from './TopBar';
import type { SettingsTab, UserThemeSetting } from './UserSettingsPanel';
import { VersionHistoryDialog } from './VersionHistoryDialog';
import { getChangedBlockIndices } from '../utils/block-diff';
import { getCharacterHighlightColor } from '../utils/character-highlight';
import { ReportsPanel } from './ReportsPanel';
import { getVersionHistory } from '../utils/screenplay-storage';
import { resolveBaselineSnapshot } from '../utils/revision-mode';
import type { DocumentViewOptions } from '../types';
import { WriterInspector } from './WriterInspector';
import { ErrorBoundary } from './ErrorBoundary';

const AiChatPanel = lazy(() => import('./ai/AiChatPanel').then((module) => ({ default: module.AiChatPanel })));

const screenplayExtensions: Extensions = [
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

function prefersCollapsedSidebars(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

interface ScreenplayEditorProps {
	documentId: string;
	onBackToHub: () => void;
	theme: UserThemeSetting;
	resolvedTheme: 'light' | 'dark';
	onThemeChange: (theme: UserThemeSetting) => void;
}

export function ScreenplayEditor({ documentId, onBackToHub, theme, resolvedTheme, onThemeChange }: ScreenplayEditorProps) {
	const persistence = useScreenplayPersistence(documentId);
	const {
		isLoaded: persistenceLoaded,
		handleUpdate: persistenceHandleUpdate,
		handleKeyDown: persistenceHandleKeyDown,
		registerEditor: registerPersistenceEditor,
		forceSave: persistenceForceSave,
		queueSave: persistenceQueueSave,
	} = persistence;
	const documentCollaboration = useDocumentCollaboration(documentId, screenplayExtensions);
	const editorRef = useRef<Editor | null>(null);
	const preInsertSnapshotRef = useRef<JSONContent | null>(null);
	const sceneResetTimerRef = useRef<number | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const hasRestoredScrollRef = useRef(false);
	const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const highlightedSceneElementRef = useRef<HTMLElement | null>(null);
	const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('script');
	const [developSubTab, setDevelopSubTab] = useState<DevelopSubTab>('basics');
	const [worldSubTab, setWorldSubTab] = useState<WorldSubTab>('characters');
	const [sidebarCollapsed, setSidebarCollapsed] = useState(() => prefersCollapsedSidebars());
	const [navigatorFocus, setNavigatorFocus] = useState<EditorNavigatorSection | null>(null);

	useEffect(() => {
		setNavigatorFocus(null);
	}, [workspaceMode, developSubTab, worldSubTab]);
	const [currentBlockType, setCurrentBlockType] = useState<ScreenplayBlockType | null>(null);
	const [editorHasFocus, setEditorHasFocus] = useState(false);
	const [inspectorCollapsed, setInspectorCollapsed] = useState(true);
	const [pageFitScale, setPageFitScale] = useState(1);
	const [chatOpen, setChatOpen] = useState(false);
	const [pendingAiPrompt, setPendingAiPrompt] = useState<string | null>(null);
	const [chatSelectionText, setChatSelectionText] = useState<string | undefined>(undefined);
	const [settingsTabRequest, setSettingsTabRequest] = useState<SettingsTab | null>(null);
	const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
	const [scriptNoteOpen, setScriptNoteOpen] = useState(false);
	const [findReplaceOpen, setFindReplaceOpen] = useState(false);
	const [reportsOpen, setReportsOpen] = useState(false);
	const [baselineContent, setBaselineContent] = useState<JSONContent | null>(null);
	const [typewriterMode, setTypewriterModeState] = useState(() => loadTypewriterMode());
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
			if (!(event.metaKey || event.ctrlKey)) {
				return;
			}

			const key = event.key.toLowerCase();

			if (key === 'l') {
				const target = event.target;

				if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
					return;
				}

				event.preventDefault();
				setChatOpen((current) => !current);
				return;
			}

			if (key === 'f') {
				event.preventDefault();
				setFindReplaceOpen(true);
			}
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
	const setDocumentContent = useScreenplayStore((state) => state.setDocumentContent);
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

	const pageScale = pageFitScale * ZOOM_MULTIPLIERS[documentLayout.zoomLevel];

	useEffect(() => {
		if (!currentDocument?.projectId) {
			return;
		}

		const { basics } = documentWorkspace.development;

		if (basics.logline.trim() || basics.synopsis.trim() || basics.genre.trim()) {
			return;
		}

		let cancelled = false;

		void (async () => {
			const project = await getProjectById(currentDocument.projectId!);

			if (cancelled || !project) {
				return;
			}

			setDocumentWorkspace({
				development: {
					...documentWorkspace.development,
					basics: {
						...basics,
						logline: project.logline ?? '',
						synopsis: project.synopsis ?? '',
						genre: project.genre ?? '',
					},
				},
			});
			void persistenceQueueSave();
		})();

		return () => {
			cancelled = true;
		};
	}, [currentDocument?.id, currentDocument?.projectId, documentWorkspace.development, persistenceQueueSave, setDocumentWorkspace]);

	useEffect(() => {
		const container = scrollContainerRef.current;

		if (!container) {
			return;
		}

		const updateScale = () => {
			setPageFitScale(computePageFitScale(container.clientWidth));
		};

		updateScale();
		const observer = new ResizeObserver(updateScale);
		observer.observe(container);

		return () => {
			observer.disconnect();
		};
	}, []);

	useEffect(() => {
		const media = window.matchMedia('(max-width: 767px)');

		const handleChange = (event: MediaQueryListEvent) => {
			if (event.matches) {
				setSidebarCollapsed(true);
				setInspectorCollapsed(true);
			}
		};

		media.addEventListener('change', handleChange);
		return () => {
			media.removeEventListener('change', handleChange);
		};
	}, []);

	const syncScriptNoteMarkers = useCallback(
		(activeEditor: Editor) => {
			const blockNodes = activeEditor.view.dom.querySelectorAll<HTMLElement>('[data-block-type]');
			const notedIndexes = new Set(
				documentWorkspace.scriptNotes
					.filter((note) => note.replies.some((reply) => reply.body.trim().length > 0))
					.map((note) => note.blockIndex),
			);

			blockNodes.forEach((node, index) => {
				if (notedIndexes.has(index)) {
					node.setAttribute('data-has-script-note', 'true');
				} else {
					node.removeAttribute('data-has-script-note');
				}
			});
		},
		[documentWorkspace.scriptNotes],
	);

	const viewOptions = documentWorkspace.viewOptions ?? {
		showChangeMarks: true,
		showCharacterHighlighting: false,
		showStructureLines: false,
	};

	const changedBlockIndices = useMemo(() => {
		if (!viewOptions.showChangeMarks || !baselineContent || !currentDocument?.content) {
			return new Set<number>();
		}

		return new Set(getChangedBlockIndices(currentDocument.content, baselineContent));
	}, [baselineContent, currentDocument?.content, viewOptions.showChangeMarks]);

	const activeRevisionColor =
		documentLayout.revisionModeActive && documentLayout.revisionColor !== 'none'
			? documentLayout.revisionColor
			: null;

	const syncEditorDecorations = useCallback(
		(activeEditor: Editor) => {
			syncScriptNoteMarkers(activeEditor);
			const blockNodes = activeEditor.view.dom.querySelectorAll<HTMLElement>('[data-block-type]');
			const blocks = getScreenplayBlocksFromContent(currentDocument?.content ?? null);
			let dialogueCharacter = '';

			blockNodes.forEach((node, index) => {
				if (changedBlockIndices.has(index)) {
					node.setAttribute('data-change-mark', 'true');

					if (activeRevisionColor) {
						node.setAttribute('data-revision-mark', activeRevisionColor);
					} else {
						node.removeAttribute('data-revision-mark');
					}
				} else {
					node.removeAttribute('data-change-mark');
					node.removeAttribute('data-revision-mark');
				}

				const block = blocks[index];

				if (block?.type === 'character') {
					dialogueCharacter = block.text.trim().toUpperCase();
				}

				if (
					viewOptions.showCharacterHighlighting &&
					!focusMode &&
					(block?.type === 'character' || block?.type === 'dialogue') &&
					dialogueCharacter
				) {
					node.style.setProperty(
						'--character-highlight-color',
						getCharacterHighlightColor(dialogueCharacter, documentWorkspace.characterHighlightColors ?? {}),
					);
				} else {
					node.style.removeProperty('--character-highlight-color');
				}
			});
		},
		[
			activeRevisionColor,
			changedBlockIndices,
			currentDocument?.content,
			documentWorkspace.characterHighlightColors,
			focusMode,
			syncScriptNoteMarkers,
			viewOptions.showCharacterHighlighting,
		],
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

			return persistenceHandleKeyDown(view, event);
		},
		[persistenceHandleKeyDown],
	);

	const editor = useEditor(
		documentCollaboration.isReady
			? {
					extensions: documentCollaboration.extensions,
					content: createEmptyScreenplayContent(),
					autofocus: false,
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
						persistenceHandleUpdate();
						updateEditorOverlayState(updatedEditor);
						syncEditorDecorations(updatedEditor);
						requestAnimationFrame(() => {
							alignDualDialogueColumns(updatedEditor.view.dom);
						});
					},
					onSelectionUpdate: ({ editor: selectionEditor }) => {
						setCurrentBlockType(getEditorBlockType(selectionEditor));
						updateEditorOverlayState(selectionEditor);
						const { from, to } = selectionEditor.state.selection;

						if (from === to) {
							setChatSelectionText(undefined);
							return;
						}

						const selectedText = selectionEditor.state.doc.textBetween(from, to, '\n').trim();
						setChatSelectionText(selectedText.length > 3 ? selectedText : undefined);
					},
					onFocus: () => {
						setEditorHasFocus(true);
					},
					onBlur: () => {
						setEditorHasFocus(false);
						setEmptyElementMenuOpen(false);
					},
				}
			: undefined,
		[documentCollaboration.extensions, documentCollaboration.isReady, handleEditorKeyDown, syncEditorDecorations, updateEditorOverlayState],
	);

	useEffect(() => {
		registerPersistenceEditor(editor);
		return () => {
			registerPersistenceEditor(null);
		};
	}, [editor, registerPersistenceEditor]);

	const editorCommands = useMemo<EditorCommands | null>(() => {
		if (!editor) {
			return null;
		}

		const captureUndoSnapshot = () => {
			preInsertSnapshotRef.current = editor.getJSON();
		};

		const insertScreenplayBlocks = (text: string) => {
			const parsed = parseScreenplayInsertText(text);
			const blocks = parsed.content ?? [];

			if (blocks.length === 0) {
				return;
			}

			captureUndoSnapshot();
			editor.chain().focus().insertContent(blocks).run();
			persistenceQueueSave();
		};

		const insertAtCursor = (text: string) => {
			const content = text.trim();
			if (!content) {
				return;
			}

			if (looksLikeScreenplayText(content)) {
				insertScreenplayBlocks(content);
				return;
			}

			captureUndoSnapshot();

			const isEmpty = editor.state.selection.$from.parent.textContent.trim().length === 0;

			if (isEmpty) {
				if (getEditorBlockType(editor) !== 'action') {
					setBlockType(editor, 'action');
				}

				replaceCurrentBlockText(editor, content);
				persistenceQueueSave();
				return;
			}

			editor.chain().focus().insertContent(content).run();
			persistenceQueueSave();
		};

		return {
			insertAtCursor,
			insertScreenplayText: insertScreenplayBlocks,
			replaceSelection: (text: string) => {
				const { from, to } = editor.state.selection;
				const content = text.trim();

				if (!content) {
					return;
				}

				if (from !== to) {
					captureUndoSnapshot();

					if (looksLikeScreenplayText(content)) {
						editor.chain().focus().deleteSelection().run();
						insertScreenplayBlocks(content);
						return;
					}

					editor.chain().focus().deleteSelection().insertContent(content).run();
					persistenceQueueSave();
					return;
				}

				insertAtCursor(content);
			},
			getSelectionText: () => {
				const { from, to } = editor.state.selection;
				return editor.state.doc.textBetween(from, to, '\n');
			},
			getCursorBlockType: () => editor.state.selection.$from.parent.type.name,
			getWorkspace: () => documentWorkspace,
			updateWorkspace: (patch) => {
				setDocumentWorkspace(patch);
				void persistenceQueueSave();
			},
			undoLastInsert: () => {
				const snapshot = preInsertSnapshotRef.current;

				if (!snapshot) {
					return false;
				}

				editor.commands.setContent(snapshot, true);
				preInsertSnapshotRef.current = null;
				persistenceQueueSave();
				return true;
			},
		};
	}, [editor, persistenceQueueSave, documentWorkspace, setDocumentWorkspace]);

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
		root.classList.toggle(
			'script-editor--character-highlight',
			viewOptions.showCharacterHighlighting && !focusMode,
		);
		const textColor = resolveLayoutTextColor(documentLayout.pageAppearance.textColor, isDark);
		root.style.color = textColor ?? (isDark ? '#e2e8f0' : '#1c1917');
	}, [
		documentLayout.pageAppearance.textColor,
		documentLayout.showSceneNumbers,
		editor,
		focusMode,
		isDark,
		viewOptions.showCharacterHighlighting,
	]);

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
			if (currentDocument) {
				await persistenceForceSave();
			}

			const loadedDocument = await loadDocumentById(documentId);

			if (!loadedDocument) {
				onBackToHub();
				return;
			}

			useScreenplayStore.getState().setCurrentDocument(loadedDocument);
			await refreshDocumentList();
			await setLastDocumentId(documentId);
			setWorkspaceMode('script');
		})();
	}, [currentDocument, documentId, isHydrated, onBackToHub, persistenceForceSave, refreshDocumentList]);

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
		const breakMap = new Map(
			computePageBreaks(currentDocument?.content ?? null).map((segment) => [
				segment.blockIndex,
				segment.marginTopPx,
			]),
		);
		const blockNodes = editorDom.querySelectorAll<HTMLElement>('[data-block-type]');

		blockNodes.forEach((node, index) => {
			const marginTopPx = breakMap.get(index);

			if (marginTopPx !== undefined) {
				node.classList.add('screenplay-page-break-before');
				node.style.marginTop = `${marginTopPx}px`;
			} else {
				node.classList.remove('screenplay-page-break-before');
				node.style.marginTop = '';
			}
		});
	}, [currentDocument?.content, documentLayout.pageViewMode, editor]);

	const pagedPageCount = useMemo(() => {
		if (currentDocument === null) {
			return 1;
		}

		return Math.max(1, groupBlocksByPage(currentDocument.content).length);
	}, [currentDocument]);

	const scriptStatsLabel = useMemo(() => {
		if (currentDocument === null) {
			return undefined;
		}

		const base = formatPageAndRuntime(pagedPageCount);

		if (documentLayout.pageViewMode === 'paged') {
			return `${base} · approx. page preview`;
		}

		return base;
	}, [currentDocument, documentLayout.pageViewMode, pagedPageCount]);

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
		setWorkspaceMode('script');
		setDevelopSubTab('basics');
		setWorldSubTab('characters');
		setWorkspaceMode('script');
		setChatOpen(false);
		setFindReplaceOpen(false);
		setVersionHistoryOpen(false);
		setScriptNoteOpen(false);
		setSidebarCollapsed(prefersCollapsedSidebars());
	}, [documentId]);

	const workspacePanelTab = workspaceMode === 'develop' ? developSubTab : worldSubTab;
	const activeWorkspaceTabLabel =
		workspaceMode === 'script'
			? 'Script'
			: workspaceMode === 'develop'
				? `Develop / ${developSubTab}`
				: `World / ${worldSubTab}`;

	const isEditorReady =
		persistenceLoaded &&
		isHydrated &&
		editor !== null &&
		currentDocument !== null &&
		currentDocument.id === documentId;

	const scrollStorageKey = `dastan.scroll.${documentId}`;

	useEffect(() => {
		hasRestoredScrollRef.current = false;

		return () => {
			hasRestoredScrollRef.current = false;

			if (scrollSaveTimerRef.current !== null) {
				window.clearTimeout(scrollSaveTimerRef.current);
				scrollSaveTimerRef.current = null;
			}
		};
	}, [documentId]);

	useEffect(() => {
		if (!isEditorReady) {
			return;
		}

		const container = scrollContainerRef.current;

		if (!container) {
			return;
		}

		const handleScroll = () => {
			if (scrollSaveTimerRef.current !== null) {
				window.clearTimeout(scrollSaveTimerRef.current);
			}

			scrollSaveTimerRef.current = window.setTimeout(() => {
				window.localStorage.setItem(scrollStorageKey, String(container.scrollTop));
			}, 300);
		};

		container.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			container.removeEventListener('scroll', handleScroll);

			if (scrollSaveTimerRef.current !== null) {
				window.clearTimeout(scrollSaveTimerRef.current);
				scrollSaveTimerRef.current = null;
			}
		};
	}, [isEditorReady, scrollStorageKey]);

	useEffect(() => {
		if (!isEditorReady || hasRestoredScrollRef.current) {
			return;
		}

		const blockNodes = currentDocument?.content?.content;

		if (!Array.isArray(blockNodes) || blockNodes.length <= 1) {
			hasRestoredScrollRef.current = true;
			return;
		}

		const savedScrollTop = window.localStorage.getItem(scrollStorageKey);

		if (savedScrollTop === null) {
			hasRestoredScrollRef.current = true;
			return;
		}

		const scrollTop = Number(savedScrollTop);

		if (!Number.isFinite(scrollTop)) {
			hasRestoredScrollRef.current = true;
			return;
		}

		const restoreTimer = window.setTimeout(() => {
			const container = scrollContainerRef.current;

			if (container) {
				container.scrollTop = scrollTop;
			}

			hasRestoredScrollRef.current = true;
		}, 50);

		return () => {
			window.clearTimeout(restoreTimer);
		};
	}, [currentDocument?.content, documentId, isEditorReady, scrollStorageKey]);

	useEffect(() => {
		if (!isEditorReady || workspaceMode !== 'script') {
			return;
		}

		const focusTimer = window.setTimeout(() => {
			editor?.chain().focus('end').run();
		}, 0);

		return () => {
			window.clearTimeout(focusTimer);
		};
	}, [workspaceMode, currentDocument?.id, editor, isEditorReady]);

	useEffect(() => {
		const handleTypewriterModeChange = (event: Event) => {
			const detail = (event as CustomEvent<boolean>).detail;

			if (typeof detail === 'boolean') {
				setTypewriterModeState(detail);
				return;
			}

			setTypewriterModeState(loadTypewriterMode());
		};

		window.addEventListener('dastan:typewriter-mode-changed', handleTypewriterModeChange);

		return () => {
			window.removeEventListener('dastan:typewriter-mode-changed', handleTypewriterModeChange);
		};
	}, []);

	const handleToggleTypewriterMode = useCallback(() => {
		const next = !typewriterMode;
		setTypewriterMode(next);
		setTypewriterModeState(next);
	}, [typewriterMode]);

	useEffect(() => {
		if (!typewriterMode || !editor || workspaceMode !== 'script') {
			return;
		}

		const handleSelectionUpdate = () => {
			if (!scrollContainerRef.current) {
				return;
			}

			const { from } = editor.state.selection;
			const domAtPos = editor.view.domAtPos(from);
			let node = domAtPos.node instanceof Element ? domAtPos.node : domAtPos.node.parentElement;
			node = node?.closest('[data-block-type]') ?? node;

			if (!node) {
				return;
			}

			const container = scrollContainerRef.current;
			const containerRect = container.getBoundingClientRect();
			const nodeRect = node.getBoundingClientRect();
			const nodeRelativeTop = nodeRect.top - containerRect.top + container.scrollTop;
			const targetScrollTop = nodeRelativeTop - container.clientHeight / 2 + nodeRect.height / 2;

			if (Math.abs(container.scrollTop - targetScrollTop) < 1) {
				return;
			}

			container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
		};

		editor.on('selectionUpdate', handleSelectionUpdate);

		return () => {
			editor.off('selectionUpdate', handleSelectionUpdate);
		};
	}, [editor, typewriterMode, workspaceMode]);

	const scrollToScene = useCallback((sceneIndex: number) => {
		setWorkspaceMode('script');

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
			void persistenceQueueSave();
		},
		[persistenceQueueSave, setDocumentTitle],
	);

	const handleLayoutChange = useCallback(
		(layout: Partial<ScreenplayDocumentLayout>) => {
			setDocumentLayout(layout);
			void persistenceQueueSave();
		},
		[persistenceQueueSave, setDocumentLayout],
	);

	const handleShowVersions = useCallback(() => {
		setNavigatorFocus('versions');
	}, []);

	const handleWorkspaceChange = useCallback(
		(workspace: Partial<ScreenplayWorkspaceData>) => {
			setDocumentWorkspace(workspace);
			void persistenceQueueSave();
		},
		[persistenceQueueSave, setDocumentWorkspace],
	);

	const handleViewOptionChange = useCallback(
		(patch: Partial<DocumentViewOptions>) => {
			handleWorkspaceChange({
				viewOptions: {
					...viewOptions,
					...patch,
				},
			});
		},
		[handleWorkspaceChange, viewOptions],
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
			void persistenceQueueSave();
		},
		[documentLayout.elementSettings, persistenceQueueSave, setDocumentLayout],
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
			void persistenceQueueSave();
		},
		[documentLayout.elementSettings, persistenceQueueSave, setDocumentLayout],
	);

	const handleExport = useCallback(
		(format: 'fountain' | 'text' | 'fdx' | 'pdf') => {
			if (currentDocument === null) {
				return;
			}

			if (format === 'pdf') {
				void import('../utils/pdf-export')
					.then(({ exportDocumentToPdf }) => {
						exportDocumentToPdf(currentDocument);
					})
					.catch((error) => {
						const message = error instanceof Error ? error.message : 'Could not export PDF.';
						window.alert(message);
					});
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
					const { parseImportedScreenplayPdfFile } = await import('../utils/screenplay-text');
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

			await persistenceForceSave();

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
			setWorkspaceMode('script');
			editor?.chain().focus('end').run();
		},
		[editor, persistenceForceSave, refreshDocumentList, setCurrentDocument],
	);

	const handleDocumentCreate = useCallback(async () => {
		await persistenceForceSave();
		const createdDocument = await createDocument('Untitled');
		const documents = await refreshDocumentList();
		setCurrentDocument(createdDocument);
		setWorkspaceMode('script');

		if (!documents.some((document) => document.id === createdDocument.id)) {
			setDocumentList([createdDocument, ...documents]);
		}

		editor?.chain().focus('end').run();
	}, [editor, persistenceForceSave, refreshDocumentList, setCurrentDocument, setDocumentList]);

	const handleDocumentSelect = useCallback(
		async (id: string) => {
			if (currentDocument?.id === id) {
				setWorkspaceMode('script');
				editor?.chain().focus('end').run();
				return;
			}

			await persistenceForceSave();
			const documents = await refreshDocumentList();

			if (!documents.some((document) => document.id === id)) {
				return;
			}

			switchDocument(id);
			await setLastDocumentId(id);
			setWorkspaceMode('script');
			editor?.chain().focus('end').run();
		},
		[currentDocument?.id, editor, persistenceForceSave, refreshDocumentList, switchDocument],
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

	const handleRestoreVersion = useCallback(
		async (versionId: string) => {
			await restoreVersionSnapshot(versionId);
			await handleVersionRestored();
		},
		[handleVersionRestored],
	);

	const handleMoveScene = useCallback(
		(direction: 'up' | 'down') => {
			if (!editor || currentDocument === null) {
				return;
			}

			const sceneIndex = getSceneIndexForBlockIndex(currentDocument.content, getCurrentBlockIndex(editor));
			const nextContent = moveSceneInContent(currentDocument.content, sceneIndex, direction);

			if (!nextContent) {
				return;
			}

			editor.commands.setContent(nextContent, false);
			setDocumentContent(nextContent);
			void persistenceQueueSave();
		},
		[currentDocument, editor, persistenceQueueSave, setDocumentContent],
	);

	const setScriptBlockType = useCallback(
		(blockType: ScreenplayBlockType) => {
			if (!editor) {
				return;
			}

			const applied = editor.chain().focus().setNode(blockType).run();

			if (applied) {
				setCurrentBlockType(blockType);
			}
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
	const sceneCount = useMemo(
		() => splitContentIntoSceneGroups(currentDocument?.content ?? { type: 'doc', content: [] }).length,
		[currentDocument?.content],
	);
	const currentSceneIndex = useMemo(() => {
		if (currentDocument === null) {
			return 0;
		}

		return getSceneIndexForBlockIndex(currentDocument.content, currentBlockIndex);
	}, [currentBlockIndex, currentDocument]);
	const currentScriptNote = useMemo(
		() => documentWorkspace.scriptNotes.find((note) => note.blockIndex === currentBlockIndex) ?? null,
		[documentWorkspace.scriptNotes, currentBlockIndex],
	);

	const handleAddScriptNoteReply = useCallback(
		(author: string, body: string) => {
			if (!editor) {
				return;
			}

			const blockIndex = getCurrentBlockIndex(editor);
			const now = new Date().toISOString();
			const existingNote = documentWorkspace.scriptNotes.find((note) => note.blockIndex === blockIndex);
			const nextReply = {
				id: crypto.randomUUID(),
				author,
				body,
				createdAt: now,
			};

			let nextNotes: ScreenplayScriptNote[];

			if (existingNote) {
				nextNotes = documentWorkspace.scriptNotes.map((note) =>
					note.blockIndex === blockIndex
						? {
								...note,
								replies: [...note.replies, nextReply],
								updatedAt: now,
							}
						: note,
				);
			} else {
				nextNotes = [
					...documentWorkspace.scriptNotes,
					normalizeScriptNote({
						id: crypto.randomUUID(),
						blockIndex,
						replies: [nextReply],
						createdAt: now,
						updatedAt: now,
					}),
				];
			}

			handleWorkspaceChange({ scriptNotes: nextNotes });
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

		syncEditorDecorations(editor);
	}, [
		activeRevisionColor,
		baselineContent,
		changedBlockIndices,
		currentDocument?.content,
		documentWorkspace.characterHighlightColors,
		documentWorkspace.scriptNotes,
		editor,
		focusMode,
		syncEditorDecorations,
		viewOptions.showCharacterHighlighting,
		viewOptions.showChangeMarks,
	]);

	useEffect(() => {
		if (!currentDocument?.id) {
			setBaselineContent(null);
			return;
		}

		let active = true;

		void (async () => {
			const versions = await getVersionHistory(currentDocument.id);
			const baseline = resolveBaselineSnapshot(
				versions,
				documentWorkspace.revisionSets ?? [],
				documentWorkspace.activeRevisionSetId ?? null,
			);

			if (active) {
				setBaselineContent(baseline?.content ?? null);
			}
		})();

		return () => {
			active = false;
		};
	}, [currentDocument?.id, currentDocument?.content, documentWorkspace.activeRevisionSetId, documentWorkspace.revisionSets]);

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

	if (!persistenceLoaded || !isHydrated || !documentCollaboration.isReady || editor === null) {
		const loadingTitle =
			currentDocument?.id === documentId && currentDocument.title.trim().length > 0
				? currentDocument.title.trim()
				: 'your script';

		return (
			<div className={`flex h-screen flex-col items-center justify-center gap-4 overflow-hidden px-6 ${editorTheme.shell}`}>
				<div className={`flex items-center gap-2 text-sm ${editorTheme.statusText}`} role="status">
					<Loader2 aria-hidden className="animate-spin" size={18} />
					Opening {loadingTitle}…
				</div>
				<p className={`max-w-sm text-center text-xs ${editorTheme.statusText}`}>
					Loading script, editor, and workspace panels.
				</p>
			</div>
		);
	}

	if (currentDocument === null || currentDocument.id !== documentId) {
		return (
			<div className={`flex h-screen flex-col items-center justify-center gap-3 overflow-hidden px-6 text-center ${editorTheme.shell}`}>
				<p className={`text-base font-medium ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>Script not found</p>
				<p className={`max-w-sm text-sm ${editorTheme.statusText}`}>
					This script may have been deleted or the link is invalid.
				</p>
				{onBackToHub ? (
					<button
						className={`mt-2 rounded-md border px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${editorTheme.statusPill}`}
						type="button"
						onClick={onBackToHub}
					>
						Back to Library
					</button>
				) : null}
			</div>
		);
	}

	return (
		<EditorCommandProvider commands={editorCommands!}>
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
				workspaceMode={workspaceMode}
				onWorkspaceModeChange={setWorkspaceMode}
				settingsTabRequest={settingsTabRequest}
				onSettingsTabRequestHandled={() => setSettingsTabRequest(null)}
				onOpenFindReplace={() => setFindReplaceOpen(true)}
				typewriterMode={typewriterMode}
				onToggleTypewriterMode={handleToggleTypewriterMode}
				scriptStatsLabel={scriptStatsLabel}
				collaborators={documentCollaboration.peers}
				collaborationActive={documentCollaboration.collaborationActive}
			/>

			{!focusMode && workspaceMode === 'script' ? (
				<FindReplacePanel
					editor={editor}
					isDark={isDark}
					open={findReplaceOpen}
					onClose={() => setFindReplaceOpen(false)}
				/>
			) : null}

			{documentLayout.revisionModeActive && documentLayout.lockedPageCount > 0 ? (
				<div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
					Revision mode: pages 1–{documentLayout.lockedPageCount} are locked. New edits apply from page {documentLayout.lockedPageCount + 1} onward.
				</div>
			) : null}

			{!focusMode ? (
				<div className={`flex h-11 shrink-0 items-center justify-center border-b px-3 md:hidden ${editorTheme.tabBar}`}>
					<EditorWorkspaceNav
						workspaceMode={workspaceMode}
						resolvedTheme={resolvedTheme}
						onModeChange={setWorkspaceMode}
					/>
				</div>
			) : null}

			{!focusMode && workspaceMode !== 'script' ? (
				<div className={`relative flex h-10 shrink-0 items-center border-b px-4 ${editorTheme.tabBar}`}>
					<EditorWorkspaceSubNav
						activeDevelopSubTab={developSubTab}
						activeWorldSubTab={worldSubTab}
						resolvedTheme={resolvedTheme}
						workspaceMode={workspaceMode}
						onDevelopSubTabChange={setDevelopSubTab}
						onWorldSubTabChange={setWorldSubTab}
					/>
					<div className="absolute right-4 flex shrink-0 items-center">
						<button
							className={`shrink-0 ${chatOpen ? editorTheme.chatToggleActive : editorTheme.chatToggle}`}
							type="button"
							aria-label="Toggle AI chat"
							aria-pressed={chatOpen}
							title="AI Chat (⌘L)"
							onClick={() => setChatOpen((currentValue) => !currentValue)}
						>
							<MessageSquare size={14} />
							Chat
						</button>
					</div>
				</div>
			) : null}

			{workspaceMode === 'script' && !focusMode ? (
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
					<div className="ml-auto flex shrink-0 items-center gap-1.5">
						<ScriptActionsMenu
							resolvedTheme={resolvedTheme}
							showSceneNumbers={documentLayout.showSceneNumbers}
							showChangeMarks={viewOptions.showChangeMarks}
							showCharacterHighlighting={viewOptions.showCharacterHighlighting}
							showStructureLines={viewOptions.showStructureLines}
							canMoveSceneUp={currentSceneIndex > 0}
							canMoveSceneDown={currentSceneIndex < sceneCount - 1}
							onExport={handleExport}
							onToggleSceneNumbers={() => {
								handleLayoutChange({ showSceneNumbers: !documentLayout.showSceneNumbers });
							}}
							onToggleChangeMarks={() => {
								handleViewOptionChange({ showChangeMarks: !viewOptions.showChangeMarks });
							}}
							onToggleCharacterHighlighting={() => {
								handleViewOptionChange({ showCharacterHighlighting: !viewOptions.showCharacterHighlighting });
							}}
							onToggleStructureLines={() => {
								handleViewOptionChange({ showStructureLines: !viewOptions.showStructureLines });
							}}
							onOpenReports={() => setReportsOpen(true)}
							onMoveSceneUp={() => handleMoveScene('up')}
							onMoveSceneDown={() => handleMoveScene('down')}
						/>
						<button
							className={`shrink-0 ${chatOpen ? editorTheme.chatToggleActive : editorTheme.chatToggle}`}
							type="button"
							aria-label="Toggle AI chat"
							aria-pressed={chatOpen}
							title="AI Chat (⌘L)"
							onClick={() => setChatOpen((currentValue) => !currentValue)}
						>
							<MessageSquare size={14} />
							Chat
						</button>
					</div>
				</div>
			) : null}
			<div className="relative z-0 flex min-h-0 flex-1 overflow-hidden">
				{!focusMode ? (
					<EditorNavigator
						collapsed={sidebarCollapsed}
						workspaceMode={workspaceMode}
						developSubTab={developSubTab}
						worldSubTab={worldSubTab}
						navigatorFocus={navigatorFocus}
						scenes={sceneHeadings}
						activeSceneIndex={currentSceneIndex}
						documentId={currentDocument.id}
						documentTitle={currentDocument.title}
						documentContent={currentDocument.content}
						workspace={documentWorkspace}
						resolvedTheme={resolvedTheme}
						onToggleCollapsed={() => setSidebarCollapsed((currentValue) => !currentValue)}
						onShowVersions={handleShowVersions}
						onSceneSelect={scrollToScene}
						onOpenVersionHistory={() => setVersionHistoryOpen(true)}
						onRestoreVersion={(versionId) => {
							void handleRestoreVersion(versionId);
						}}
					/>
				) : null}

				<main className={`relative flex min-h-0 min-w-0 flex-1 overflow-hidden ${editorTheme.main}`}>
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						<div
							ref={scrollContainerRef}
							className="flex min-h-0 flex-1 justify-center overflow-x-hidden overflow-y-auto px-4 py-6 md:px-8 md:py-8"
						>
							{workspaceMode === 'script' ? (
								<div className="relative mx-auto" style={{ width: SCRIPT_PAGE_WIDTH_PX * pageScale }}>
									<div
										className={`origin-top-left transition-transform duration-150 ${isDark ? 'script-page--dark' : ''}`}
										style={{
											width: SCRIPT_PAGE_WIDTH_PX,
											transform: `scale(${pageScale})`,
											transformOrigin: 'top left',
										}}
									>
										{documentLayout.pageViewMode === 'paged' ? renderPagedView : renderContinuousPage}
									</div>
								</div>
							) : (
								<div key={workspacePanelTab} className="workspace-panel-enter mx-auto w-full max-w-5xl px-2 py-6 sm:py-8">
									<ScreenplayWorkspacePanel
										activeTab={workspacePanelTab}
										documentTitle={currentDocument.title}
										scenes={sceneHeadings}
										blocks={screenplayBlocks}
										workspace={documentWorkspace}
										resolvedTheme={resolvedTheme}
										onTitleChange={handleTitleChange}
										onWorkspaceChange={handleWorkspaceChange}
										onSceneSelect={scrollToScene}
										onRequestStructureReview={(prompt) => {
											setChatOpen(true);
											setPendingAiPrompt(prompt);
										}}
									/>
								</div>
							)}
						</div>
					</div>

					{!focusMode && workspaceMode === 'script' ? (
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

				{!focusMode ? (
					<ErrorBoundary label="ai-chat" fallback={null}>
						<Suspense fallback={null}>
							<AiChatPanel
							open={chatOpen}
							variant="editor"
							selectionText={chatSelectionText}
							activeBlockIndex={currentBlockIndex}
							pendingPrompt={pendingAiPrompt}
							onPendingPromptHandled={() => setPendingAiPrompt(null)}
							scriptContext={{
								documentId: currentDocument.id,
								projectId: currentDocument.projectId,
								documentTitle: currentDocument.title,
								documentContent: currentDocument.content,
								workspace: documentWorkspace,
							}}
							resolvedTheme={resolvedTheme}
							onClose={() => setChatOpen(false)}
							onOpenSettings={() => {
								setChatOpen(false);
								setSettingsTabRequest('ai');
							}}
							collaborationRoomId={documentCollaboration.roomId}
							activeCollaborators={documentCollaboration.peers}
							activeWorkspaceTab={activeWorkspaceTabLabel}
						/>
						</Suspense>
					</ErrorBoundary>
				) : null}
			</div>

			{!focusMode && workspaceMode === 'script' && editor ? (
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
				onAddReply={handleAddScriptNoteReply}
				onDelete={handleDeleteScriptNote}
			/>

			<ReportsPanel
				open={reportsOpen}
				content={currentDocument.content}
				documentTitle={currentDocument.title}
				resolvedTheme={resolvedTheme}
				onClose={() => setReportsOpen(false)}
			/>

			<VersionHistoryDialog
				open={versionHistoryOpen}
				documentId={currentDocument.id}
				currentContent={currentDocument.content}
				onClose={() => setVersionHistoryOpen(false)}
				onRestored={() => {
					void handleVersionRestored();
				}}
			/>

	</div>
	</EditorCommandProvider>
	);
}
