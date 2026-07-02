import { useCallback, useEffect, useState } from 'react';
import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../types';
import type { SettingsTab } from '../utils/user-settings';
import { createProject } from '../utils/screenplay-storage';

export type HubConfirmDialogState = {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	destructive?: boolean;
	onConfirm: () => void;
};

export type HubPromptDialogState = {
	open: boolean;
	title: string;
	description?: string;
	label?: string;
	defaultValue?: string;
	confirmLabel?: string;
	onConfirm: (value: string) => void;
};

interface UseHubDialogsParams {
	selectedProjectId: string | null;
	refreshProjects: () => Promise<ScreenplayProjectRecord[]>;
	openFolder: (projectId: string | null) => void;
}

export function useHubDialogs({
	selectedProjectId,
	refreshProjects,
	openFolder,
}: UseHubDialogsParams) {
	const [confirmDialog, setConfirmDialog] = useState<HubConfirmDialogState | null>(null);
	const [promptDialog, setPromptDialog] = useState<HubPromptDialogState | null>(null);
	const [projectInfoProject, setProjectInfoProject] = useState<ScreenplayProjectRecord | null>(null);
	const [moveDialogOpen, setMoveDialogOpen] = useState(false);
	const [moveDocumentId, setMoveDocumentId] = useState<string | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab | undefined>(undefined);
	const [chatOpen, setChatOpen] = useState(false);
	const [projectShareOpen, setProjectShareOpen] = useState(false);
	const [shareProject, setShareProject] = useState<ScreenplayProjectRecord | null>(null);
	const [documentShareOpen, setDocumentShareOpen] = useState(false);
	const [shareDocumentId, setShareDocumentId] = useState<string | undefined>(undefined);
	const [shareDocumentTitle, setShareDocumentTitle] = useState('');

	const closeConfirmDialog = useCallback(() => {
		setConfirmDialog(null);
	}, []);

	const closePromptDialog = useCallback(() => {
		setPromptDialog(null);
	}, []);

	const openConfirmDialog = useCallback((dialog: Omit<HubConfirmDialogState, 'open'>) => {
		setConfirmDialog({ ...dialog, open: true });
	}, []);

	const showAlert = useCallback(
		(title: string, description: string) => {
			openConfirmDialog({
				title,
				description,
				confirmLabel: 'OK',
				onConfirm: () => {
					setConfirmDialog(null);
				},
			});
		},
		[openConfirmDialog],
	);

	const openCreateProjectPrompt = useCallback(
		(parentProjectId?: string | null) => {
			const isSubfolder = (parentProjectId ?? selectedProjectId) !== null;

			setPromptDialog({
				open: true,
				title: isSubfolder ? 'Create subfolder' : 'Create project',
				description: isSubfolder ? 'Name your new subfolder.' : 'Name your new project folder.',
				label: 'Folder name',
				defaultValue: isSubfolder ? 'Untitled subfolder' : 'Untitled Project',
				confirmLabel: 'Create',
				onConfirm: (title) => {
					if (!title) {
						return;
					}

					void (async () => {
						const createdProject = await createProject(title, parentProjectId ?? selectedProjectId ?? null);
						await refreshProjects();
						openFolder(createdProject.id);
					})();

					setPromptDialog(null);
				},
			});
		},
		[openFolder, refreshProjects, selectedProjectId],
	);

	const openMoveDialog = useCallback((documentId: string) => {
		setMoveDocumentId(documentId);
		setMoveDialogOpen(true);
	}, []);

	const closeMoveDialog = useCallback(() => {
		setMoveDialogOpen(false);
		setMoveDocumentId(null);
	}, []);

	const openDocumentShare = useCallback((document: ScreenplayDocumentRecord) => {
		setShareDocumentId(document.id);
		setShareDocumentTitle(document.title || 'Untitled');
		setDocumentShareOpen(true);
	}, []);

	const openSettings = useCallback(() => {
		setSettingsInitialTab(undefined);
		setSettingsOpen(true);
	}, []);

	const clearProjectInfo = useCallback(() => {
		setProjectInfoProject(null);
	}, []);

	useEffect(() => {
		if (!settingsOpen) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setSettingsOpen(false);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [settingsOpen]);

	return {
		confirmDialog,
		promptDialog,
		projectInfoProject,
		moveDialogOpen,
		moveDocumentId,
		settingsOpen,
		settingsInitialTab,
		chatOpen,
		projectShareOpen,
		shareProject,
		documentShareOpen,
		shareDocumentId,
		shareDocumentTitle,
		setProjectInfoProject,
		setShareProject,
		setProjectShareOpen,
		setDocumentShareOpen,
		setShareDocumentId,
		setShareDocumentTitle,
		setChatOpen,
		setSettingsOpen,
		setSettingsInitialTab,
		openCreateProjectPrompt,
		openMoveDialog,
		openDocumentShare,
		showAlert,
		openConfirmDialog,
		closeConfirmDialog,
		closePromptDialog,
		closeMoveDialog,
		clearProjectInfo,
		openSettings,
	};
}
