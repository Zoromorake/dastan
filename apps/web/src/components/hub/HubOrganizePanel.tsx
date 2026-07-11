import { FolderPlus } from 'lucide-react';
import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../../types';
import { getHubTheme } from '../../utils/hub-theme';
import { isHubFile } from '../../utils/hub-item-kind';
import { HubProjectsGrid } from './HubProjectsGrid';
import { NewScriptMenu } from './NewScriptMenu';
import { AddHubFileButton } from './AddHubFileButton';
import { HubFilesList } from './HubFilesList';
import { HubFileDropZone } from './HubFileDropZone';
import type { ScriptTemplate } from '../../utils/user-settings';

interface HubOrganizePanelProps {
	projects: ScreenplayProjectRecord[];
	documents: ScreenplayDocumentRecord[];
	allProjects: ScreenplayProjectRecord[];
	isDark: boolean;
	selectedLibraryProjectId: string | null;
	selectedProjectId: string | null;
	onSelectLibraryProject: (projectId: string) => void;
	onCreateProject: () => void;
	onOpenProjectFolder: (projectId: string) => void;
	onEditProject: (project: ScreenplayProjectRecord) => void;
	onShareProject: (project: ScreenplayProjectRecord) => void;
	onDuplicateProject: (projectId: string) => void;
	onDeleteProject: (projectId: string) => void;
	onStartScratch: () => void;
	onStartGuide: () => void;
	onCreateTemplate: (template: ScriptTemplate) => void;
	onImport: (file: File) => void;
	onAddHubFile: (file: File) => void;
	onAddHubFiles?: (files: File[]) => void;
	onOpenHubFile: (document: ScreenplayDocumentRecord) => void;
	onDeleteHubFile: (documentId: string) => void;
	onMoveHubFile: (documentId: string) => void;
}

export function HubOrganizePanel({
	projects,
	documents,
	allProjects,
	isDark,
	selectedLibraryProjectId,
	selectedProjectId,
	onSelectLibraryProject,
	onCreateProject,
	onOpenProjectFolder,
	onEditProject,
	onShareProject,
	onDuplicateProject,
	onDeleteProject,
	onStartScratch,
	onStartGuide,
	onCreateTemplate,
	onImport,
	onAddHubFile,
	onAddHubFiles,
	onOpenHubFile,
	onDeleteHubFile,
	onMoveHubFile,
}: HubOrganizePanelProps) {
	const hub = getHubTheme(isDark);
	const scopedHubFiles = documents.filter((document) => {
		if (!isHubFile(document)) {
			return false;
		}

		if (selectedProjectId === null) {
			return !document.projectId;
		}

		return document.projectId === selectedProjectId;
	});

	const handleAddFiles = (files: File[]) => {
		if (onAddHubFiles) {
			onAddHubFiles(files);
			return;
		}

		for (const file of files) {
			onAddHubFile(file);
		}
	};

	return (
		<section>
			<div className="mb-4">
				<h2 className={`text-lg font-semibold ${hub.panelTitle}`}>Organize</h2>
				<p className={`mt-0.5 text-sm ${hub.panelMuted}`}>Folders, files, and import — drag files here too</p>
			</div>

			<div className={`rounded-2xl border ${hub.border}`}>
				<div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-4">
					<NewScriptMenu
						isDark={isDark}
						size="sm"
						appearance="outline"
						onStartScratch={onStartScratch}
						onStartGuide={onStartGuide}
						onCreateTemplate={onCreateTemplate}
						onImport={onImport}
					/>
					<AddHubFileButton isDark={isDark} size="sm" onAddFile={onAddHubFile} />
					<button
						className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${hub.ghostButton}`}
						type="button"
						onClick={onCreateProject}
					>
						<FolderPlus size={15} />
						New folder
					</button>
				</div>

				<HubFileDropZone
					className="min-h-[12rem] rounded-b-2xl px-4 py-4"
					hint="Drop files into Organize"
					isDark={isDark}
					onAddFiles={handleAddFiles}
				>
					<div className="space-y-5">
						<HubFilesList
							documents={scopedHubFiles}
							isDark={isDark}
							onDelete={onDeleteHubFile}
							onMove={onMoveHubFile}
							onOpenFile={onOpenHubFile}
						/>

						{scopedHubFiles.length === 0 ? (
							<div
								className={`flex min-h-[7rem] items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center text-sm ${hub.dashed}`}
							>
								Drag files anywhere in this area to add reference files
							</div>
						) : null}

						<HubProjectsGrid
							title="Folders"
							projects={projects}
							documents={documents}
							allProjects={allProjects}
							isDark={isDark}
							isSubfolderView={false}
							createLabel="New folder"
							selectedLibraryProjectId={selectedLibraryProjectId}
							onSelectLibraryProject={onSelectLibraryProject}
							onCreateProject={onCreateProject}
							onOpenProjectFolder={onOpenProjectFolder}
							onEditProject={onEditProject}
							onShareProject={onShareProject}
							onDuplicateProject={onDuplicateProject}
							onDeleteProject={onDeleteProject}
						/>
					</div>
				</HubFileDropZone>
			</div>
		</section>
	);
}
