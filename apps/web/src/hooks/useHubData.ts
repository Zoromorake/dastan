import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../types';
import { createDefaultWorkspaceData } from '../types';
import {
	filterDocumentsForFolder,
	getChildProjects,
	getProjectBreadcrumbs,
	getProjectPathLabel,
	getRelativeFolderLabel,
} from '../utils/hub-folder-utils';
import {
	createDocument,
	createHubFile,
	createTemplateScreenplayContent,
	deleteProject,
	duplicateDocument,
	duplicateProject,
	getActiveDocuments,
	getAllProjects,
	getTrashedDocuments,
	getTrashedProjects,
	moveDocumentToProject,
	permanentlyDeleteDocument,
	permanentlyDeleteProject,
	purgeExpiredTrash,
	renameDocument,
	restoreDocument,
	restoreProject,
	saveDocument,
	softDeleteDocument,
	updateProject,
} from '../utils/screenplay-storage';
import { createFirstRunSampleContent } from '../utils/sample-first-script';
import { loadFirstRunSeeded, setFirstRunSeeded } from '../utils/first-run';
import { isSupportedScreenplayImport, parseImportedScreenplayFile, parseImportedScreenplayPdfFile } from '../utils/screenplay-text';
import { SCRIPT_TEMPLATE_STRUCTURE } from '../utils/script-templates';
import { createStructureBeatsFromTemplate } from '../utils/story-structure';
import type { ScriptTemplate } from '../utils/user-settings';
import type { HubConfirmDialogState } from './useHubDialogs';
import { createEphemeralDocument } from '../utils/ephemeral-documents';
import { findReusableUntitledBlank } from '../utils/untitled-dedupe';
import { sweepBlankDrafts } from '../utils/hub-sweep';
import { UNTITLED_SCREENPLAY_TITLE } from '../utils/scratch-template';
import { readFileAsDataUrl } from '../utils/image-crop';

const MAX_HUB_FILE_BYTES = 8 * 1024 * 1024;

const TEMPLATE_TITLES: Record<ScriptTemplate, string> = {
	feature: 'Feature Draft',
	short: 'Short Film Draft',
	tv_pilot: 'TV Pilot Draft',
	tv_episode: 'TV Episode Draft',
	stage_play: 'Stage Play Draft',
	documentary: 'Documentary Draft',
};

function buildTemplateWorkspace(template: ScriptTemplate) {
	const structureTemplate = SCRIPT_TEMPLATE_STRUCTURE[template];
	const workspace = createDefaultWorkspaceData();

	return {
		...workspace,
		development: {
			...workspace.development,
			structureTemplate,
			structureBeats:
				structureTemplate === 'blank' ? [] : createStructureBeatsFromTemplate(structureTemplate),
		},
	};
}

interface UseHubDataParams {
	selectedProjectId: string | null;
	searchValue: string;
	editingDocumentId: string | null;
	editingTitle: string;
	onOpenDocument: (id: string) => void;
	onNavigateToProject?: (projectId: string | null) => void;
	openFolder: (projectId: string | null) => void;
	showAlert: (title: string, description: string) => void;
	openConfirmDialog: (dialog: Omit<HubConfirmDialogState, 'open'>) => void;
	closeConfirmDialog: () => void;
	moveDocumentId: string | null;
	closeMoveDialog: () => void;
	clearEditing: () => void;
	projectInfoProject: ScreenplayProjectRecord | null;
	clearProjectInfo: () => void;
	onAfterRefresh?: () => void;
	onSweep?: (documents: ScreenplayDocumentRecord[]) => void;
}

export function useHubData({
	selectedProjectId,
	searchValue,
	editingDocumentId,
	editingTitle,
	onOpenDocument,
	onNavigateToProject: _onNavigateToProject,
	openFolder,
	showAlert,
	openConfirmDialog,
	closeConfirmDialog,
	moveDocumentId,
	closeMoveDialog,
	clearEditing,
	projectInfoProject,
	clearProjectInfo,
	onAfterRefresh,
	onSweep,
}: UseHubDataParams) {
	const [documents, setDocuments] = useState<ScreenplayDocumentRecord[]>([]);
	const [trashedDocuments, setTrashedDocuments] = useState<ScreenplayDocumentRecord[]>([]);
	const [trashedProjects, setTrashedProjects] = useState<ScreenplayProjectRecord[]>([]);
	const [projects, setProjects] = useState<ScreenplayProjectRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const onAfterRefreshRef = useRef(onAfterRefresh);
	const onSweepRef = useRef(onSweep);

	onAfterRefreshRef.current = onAfterRefresh;
	onSweepRef.current = onSweep;

	const refreshDocuments = useCallback(async () => {
		const nextDocuments = await getActiveDocuments();
		setDocuments(nextDocuments);
		return nextDocuments;
	}, []);

	const refreshTrash = useCallback(async () => {
		const [nextTrashedDocuments, nextTrashedProjects] = await Promise.all([
			getTrashedDocuments(),
			getTrashedProjects(),
		]);
		setTrashedDocuments(nextTrashedDocuments);
		setTrashedProjects(nextTrashedProjects);
		return { nextTrashedDocuments, nextTrashedProjects };
	}, []);

	const refreshProjects = useCallback(async () => {
		const nextProjects = await getAllProjects();
		setProjects(nextProjects);
		return nextProjects;
	}, []);

	const refreshAll = useCallback(async () => {
		const [nextDocuments, trashResult, nextProjects] = await Promise.all([
			refreshDocuments(),
			refreshTrash(),
			refreshProjects(),
		]);

		const { sweptDocuments } = await sweepBlankDrafts(nextDocuments);

		if (sweptDocuments.length > 0) {
			onSweepRef.current?.(sweptDocuments);
			await refreshDocuments();
			await refreshTrash();
		}

		onAfterRefreshRef.current?.();
		return { nextDocuments, ...trashResult, nextProjects };
	}, [refreshDocuments, refreshProjects, refreshTrash]);

	useEffect(() => {
		let active = true;

		void (async () => {
			try {
				await purgeExpiredTrash();

				if (!active) {
					return;
				}

				await refreshAll();
			} catch (error) {
				console.error('Failed to load library', error);

				if (active) {
					setLoadError(true);
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		})();

		return () => {
			active = false;
		};
	}, [refreshAll]);

	useEffect(() => {
		if (loading || loadError || documents.length > 0 || projects.length > 0 || loadFirstRunSeeded()) {
			return;
		}

		let active = true;

		void (async () => {
			try {
				const createdDocument = await createDocument('The Last Garden', createFirstRunSampleContent());
				setFirstRunSeeded(true);
				sessionStorage.setItem('dastan.pending-tour', '1');

				if (active) {
					await refreshAll();
					onOpenDocument(createdDocument.id);
				}
			} catch (error) {
				console.error('Failed to seed first-run sample script', error);
			}
		})();

		return () => {
			active = false;
		};
	}, [documents.length, loadError, loading, onOpenDocument, projects.length, refreshAll]);

	const visibleProjects = useMemo(() => {
		const query = searchValue.trim().toLowerCase();
		const children = getChildProjects(projects, selectedProjectId);

		if (query.length === 0) {
			return children;
		}

		return children.filter((project) => {
			const haystack = [project.title, project.genre, project.logline, project.synopsis?.slice(0, 300)]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return haystack.includes(query);
		});
	}, [projects, searchValue, selectedProjectId]);

	const filteredDocuments = useMemo(() => {
		const query = searchValue.trim().toLowerCase();
		const scoped = filterDocumentsForFolder(documents, projects, selectedProjectId);

		if (query.length === 0) {
			return scoped;
		}

		return scoped.filter((document) => {
			const haystack = [
				document.title,
				document.workspace?.development?.basics?.genre,
				document.workspace?.development?.basics?.logline,
				document.workspace?.development?.basics?.synopsis?.slice(0, 300),
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return haystack.includes(query);
		});
	}, [documents, projects, searchValue, selectedProjectId]);

	const filteredTrashDocuments = useMemo(() => {
		const query = searchValue.trim().toLowerCase();

		if (query.length === 0) {
			return trashedDocuments;
		}

		return trashedDocuments.filter((document) => document.title.toLowerCase().includes(query));
	}, [searchValue, trashedDocuments]);

	const filteredTrashProjects = useMemo(() => {
		const query = searchValue.trim().toLowerCase();

		if (query.length === 0) {
			return trashedProjects;
		}

		return trashedProjects.filter((project) => project.title.toLowerCase().includes(query));
	}, [searchValue, trashedProjects]);

	const moveDocument = useMemo(
		() => documents.find((document) => document.id === moveDocumentId) ?? null,
		[documents, moveDocumentId],
	);

	const selectedProject = useMemo(
		() => projects.find((project) => project.id === selectedProjectId) ?? null,
		[projects, selectedProjectId],
	);

	const resolveProjectId = useCallback(
		(projectId?: string) => projectId ?? selectedProjectId ?? undefined,
		[selectedProjectId],
	);

	const handleCreateScratch = useCallback(
		async (projectId?: string) => {
			const reusable = findReusableUntitledBlank(documents);

			if (reusable) {
				onOpenDocument(reusable.id);
				return;
			}

			const createdDocument = createEphemeralDocument({
				projectId: resolveProjectId(projectId),
			});
			onOpenDocument(createdDocument.id);
		},
		[documents, onOpenDocument, resolveProjectId],
	);

	const handleStartGuide = useCallback(
		async (projectId?: string) => {
			const createdDocument = createEphemeralDocument({
				projectId: resolveProjectId(projectId),
				withGuide: true,
			});
			onOpenDocument(createdDocument.id);
		},
		[onOpenDocument, resolveProjectId],
	);

	const handleCreateTemplate = useCallback(
		async (template: ScriptTemplate, projectId?: string) => {
			const createdDocument = await createDocument(
				TEMPLATE_TITLES[template],
				createTemplateScreenplayContent(template),
				resolveProjectId(projectId),
				buildTemplateWorkspace(template),
			);
			await refreshAll();
			onOpenDocument(createdDocument.id);
		},
		[onOpenDocument, refreshAll, resolveProjectId],
	);

	const handleSaveProjectInfo = useCallback(
		async (updates: Pick<ScreenplayProjectRecord, 'title' | 'genre' | 'logline' | 'synopsis' | 'coverImageDataUrl'>) => {
			if (!projectInfoProject) {
				return;
			}

			await updateProject(projectInfoProject.id, updates);
			await refreshProjects();
			clearProjectInfo();
		},
		[clearProjectInfo, projectInfoProject, refreshProjects],
	);

	const handleUploadFile = useCallback(
		async (file: File, projectId?: string) => {
			if (!isSupportedScreenplayImport(file.name)) {
				showAlert('Unsupported file type', 'Import supports .fountain, .fdx, .txt, and .pdf files.');
				return;
			}

			const title = file.name.replace(/\.[^.]+$/u, '').trim() || 'Imported Script';
			const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

			let content;

			try {
				if (extension === 'pdf') {
					const sourceBuffer = await file.arrayBuffer();
					content = await parseImportedScreenplayPdfFile(sourceBuffer);
				} else {
					const sourceText = await file.text();
					content = parseImportedScreenplayFile(file.name, sourceText);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Could not parse this file.';
				showAlert('Import failed', `${message} Try exporting it as .fdx or .fountain and importing again.`);
				return;
			}

			const createdDocument = await createDocument(title, content, resolveProjectId(projectId));

			await refreshAll();
			onOpenDocument(createdDocument.id);
		},
		[onOpenDocument, refreshAll, resolveProjectId, showAlert],
	);

	const handleSoftDelete = useCallback(
		(id: string) => {
			const documentToDelete = documents.find((document) => document.id === id);
			const label = documentToDelete?.title || 'Untitled';

			openConfirmDialog({
				title: 'Move to trash',
				description: `Move "${label}" to trash? You can restore it within 30 days.`,
				confirmLabel: 'Move to trash',
				destructive: true,
				onConfirm: () => {
					void (async () => {
						await softDeleteDocument(id);
						await refreshAll();
						closeConfirmDialog();
					})();
				},
			});
		},
		[closeConfirmDialog, documents, openConfirmDialog, refreshAll],
	);

	const handleDeleteProject = useCallback(
		(id: string) => {
			const projectToDelete = projects.find((project) => project.id === id);
			const label = projectToDelete?.title || 'Untitled Project';

			openConfirmDialog({
				title: 'Move to trash',
				description: `Move "${label}" to trash? Scripts inside will remain in your library. You can restore within 30 days.`,
				confirmLabel: 'Move to trash',
				destructive: true,
				onConfirm: () => {
					void (async () => {
						const parentProjectId = projectToDelete?.parentProjectId ?? null;

						await deleteProject(id);

						if (selectedProjectId === id) {
							openFolder(parentProjectId);
						}

						await refreshAll();
						closeConfirmDialog();
					})();
				},
			});
		},
		[closeConfirmDialog, openConfirmDialog, openFolder, projects, refreshAll, selectedProjectId],
	);

	const handleRestoreDocument = useCallback(
		async (id: string) => {
			await restoreDocument(id);
			await refreshAll();
		},
		[refreshAll],
	);

	const handlePermanentDelete = useCallback(
		(id: string) => {
			const documentToDelete = trashedDocuments.find((document) => document.id === id);
			const label = documentToDelete?.title || 'Untitled';

			openConfirmDialog({
				title: 'Delete forever',
				description: `Permanently delete "${label}"? This cannot be undone.`,
				confirmLabel: 'Delete forever',
				destructive: true,
				onConfirm: () => {
					void (async () => {
						await permanentlyDeleteDocument(id);
						await refreshAll();
						closeConfirmDialog();
					})();
				},
			});
		},
		[closeConfirmDialog, openConfirmDialog, refreshAll, trashedDocuments],
	);

	const handleDuplicateDocument = useCallback(
		async (id: string) => {
			const duplicate = await duplicateDocument(id);

			if (!duplicate) {
				showAlert('Could not duplicate', 'This script may have been deleted.');
				return;
			}

			await refreshAll();
			onOpenDocument(duplicate.id);
		},
		[onOpenDocument, refreshAll, showAlert],
	);

	const handleDuplicateProject = useCallback(
		async (id: string) => {
			const duplicate = await duplicateProject(id);

			if (!duplicate) {
				showAlert('Could not duplicate', 'This project may have been deleted.');
				return;
			}

			await refreshAll();
			openFolder(duplicate.id);
		},
		[openFolder, refreshAll, showAlert],
	);

	const handleRestoreProject = useCallback(
		async (id: string) => {
			await restoreProject(id);
			await refreshAll();
		},
		[refreshAll],
	);

	const handlePermanentDeleteProject = useCallback(
		(id: string) => {
			const projectToDelete = trashedProjects.find((project) => project.id === id);
			const label = projectToDelete?.title || 'Untitled Project';

			openConfirmDialog({
				title: 'Delete forever',
				description: `Permanently delete "${label}"? This cannot be undone.`,
				confirmLabel: 'Delete forever',
				destructive: true,
				onConfirm: () => {
					void (async () => {
						await permanentlyDeleteProject(id);
						await refreshAll();
						closeConfirmDialog();
					})();
				},
			});
		},
		[closeConfirmDialog, openConfirmDialog, refreshAll, trashedProjects],
	);

	const commitDocumentRename = useCallback(
		async (documentId: string) => {
			const nextTitle = editingTitle.trim();

			clearEditing();

			if (!nextTitle) {
				return;
			}

			const currentDocument = documents.find((document) => document.id === documentId);

			if (!currentDocument || currentDocument.title === nextTitle) {
				return;
			}

			await renameDocument(documentId, nextTitle);
			await refreshDocuments();
		},
		[clearEditing, documents, editingTitle, refreshDocuments],
	);

	const updateDocumentPoster = useCallback(
		async (documentId: string, posterImageDataUrl: string | null) => {
			const currentDocument = documents.find((document) => document.id === documentId);

			if (!currentDocument) {
				return;
			}

			await saveDocument({ ...currentDocument, posterImageDataUrl });
			await refreshDocuments();
		},
		[documents, refreshDocuments],
	);

	const handleAddHubFile = useCallback(
		async (file: File, projectId?: string) => {
			if (file.size > MAX_HUB_FILE_BYTES) {
				showAlert('File too large', 'Hub files must be 8 MB or smaller.');
				return;
			}

			const dataUrl = await readFileAsDataUrl(file);

			await createHubFile({
				fileName: file.name,
				mimeType: file.type || 'application/octet-stream',
				dataUrl,
				byteSize: file.size,
				projectId: resolveProjectId(projectId),
			});
			await refreshDocuments();
		},
		[refreshDocuments, resolveProjectId, showAlert],
	);

	const handleMoveDocument = useCallback(
		async (projectId: string | null) => {
			if (!moveDocumentId) {
				return;
			}

			await moveDocumentToProject(moveDocumentId, projectId);
			await refreshAll();
			closeMoveDialog();
		},
		[closeMoveDialog, moveDocumentId, refreshAll],
	);

	const libraryBreadcrumbs = useMemo(() => {
		if (!selectedProject) {
			return [{ label: 'Library' }];
		}

		const chain = getProjectBreadcrumbs(projects, selectedProject.id);

		return [
			{ label: 'Library', onClick: () => openFolder(null) },
			...chain.map((project, index) => ({
				label: project.title || 'Untitled project',
				onClick: index < chain.length - 1 ? () => openFolder(project.id) : undefined,
			})),
		];
	}, [openFolder, projects, selectedProject]);

	const getDocumentLocationLabel = useCallback(
		(document: ScreenplayDocumentRecord) => {
			if (selectedProjectId) {
				return getRelativeFolderLabel(projects, selectedProjectId, document.projectId);
			}

			return getProjectPathLabel(projects, document.projectId) ?? 'Library';
		},
		[projects, selectedProjectId],
	);

	const selectedFolderStats = useMemo(() => {
		if (!selectedProject) {
			return null;
		}

		const subfolderCount = getChildProjects(projects, selectedProject.id).length;
		const fileCount = filterDocumentsForFolder(documents, projects, selectedProject.id).length;
		const directDocuments = documents.filter((document) => document.projectId === selectedProject.id);
		const lastActivity =
			directDocuments.length > 0
				? directDocuments.reduce(
						(latest, document) => (document.updatedAt > latest ? document.updatedAt : latest),
						directDocuments[0].updatedAt,
					)
				: selectedProject.updatedAt;

		return { subfolderCount, fileCount, lastActivity };
	}, [documents, projects, selectedProject]);

	return {
		documents,
		trashedDocuments,
		trashedProjects,
		projects,
		loading,
		loadError,
		refreshDocuments,
		refreshTrash,
		refreshProjects,
		refreshAll,
		handleCreateScratch,
		handleStartGuide,
		handleCreateTemplate,
		handleUploadFile,
		handleSoftDelete,
		handleDeleteProject,
		handleDuplicateDocument,
		handleDuplicateProject,
		handleRestoreDocument,
		handleRestoreProject,
		handlePermanentDelete,
		handlePermanentDeleteProject,
		commitDocumentRename,
		updateDocumentPoster,
		handleAddHubFile,
		handleMoveDocument,
		handleSaveProjectInfo,
		moveDocument,
		selectedProject,
		filteredDocuments,
		filteredTrashDocuments,
		filteredTrashProjects,
		visibleProjects,
		selectedFolderStats,
		libraryBreadcrumbs,
		getDocumentLocationLabel,
	};
}
