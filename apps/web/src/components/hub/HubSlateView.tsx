import { LayoutGrid, List } from 'lucide-react';
import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../../types';
import { getHubTheme } from '../../utils/hub-theme';
import { isHubScript } from '../../utils/hub-item-kind';
import type { FileViewMode } from './types';
import { HubSectionDivider } from './HubSectionDivider';
import { HubTodayPanel } from './HubTodayPanel';
import { HubOrganizePanel } from './HubOrganizePanel';
import { ScriptPosterCard } from './ScriptPosterCard';
import { ScriptListItem, SCRIPT_LIST_GRID_WITH_LOCATION } from './ScriptListItem';
import { HubEmptyMark } from './HubEmptyMark';
import { NewScriptMenu } from './NewScriptMenu';
import { AddHubFileButton } from './AddHubFileButton';
import { HubFileDropZone } from './HubFileDropZone';
import { HubFilesList } from './HubFilesList';
import type { ScriptTemplate } from '../../utils/user-settings';

interface HubSlateViewProps {
	documents: ScreenplayDocumentRecord[];
	allProjects: ScreenplayProjectRecord[];
	visibleProjects: ScreenplayProjectRecord[];
	fileViewMode: FileViewMode;
	isDark: boolean;
	authorName: string;
	editingDocumentId: string | null;
	editingTitle: string;
	selectedLibraryDocumentId: string | null;
	selectedLibraryProjectId: string | null;
	selectedProject: ScreenplayProjectRecord | null;
	selectedProjectId: string | null;
	getLocationLabel: (document: ScreenplayDocumentRecord) => string | null;
	onFileViewModeChange: (mode: FileViewMode) => void;
	onSelectLibraryDocument: (documentId: string) => void;
	onSelectLibraryProject: (projectId: string) => void;
	onOpenDocument: (id: string, options?: { blockIndex?: number }) => void;
	onStartScratch: () => void;
	onStartGuide: () => void;
	onCreateTemplate: (template: ScriptTemplate) => void;
	onImport: (file: File) => void;
	onAddHubFile: (file: File) => void;
	onAddHubFiles?: (files: File[]) => void;
	onOpenHubFile: (document: ScreenplayDocumentRecord) => void;
	onStartRename: (document: ScreenplayDocumentRecord) => void;
	onCommitRename: (documentId: string) => void;
	onCancelRename: () => void;
	onEditingTitleChange: (value: string) => void;
	onMove: (documentId: string) => void;
	onDuplicate: (documentId: string) => void;
	onShare: (document: ScreenplayDocumentRecord) => void;
	onDelete: (documentId: string) => void;
	onPosterChange: (documentId: string, posterImageDataUrl: string | null) => void;
	onCreateProject: () => void;
	onOpenProjectFolder: (projectId: string) => void;
	onEditProject: (project: ScreenplayProjectRecord) => void;
	onShareProject: (project: ScreenplayProjectRecord) => void;
	onDuplicateProject: (projectId: string) => void;
	onDeleteProject: (projectId: string) => void;
}

export function HubSlateView({
	documents,
	allProjects,
	visibleProjects,
	fileViewMode,
	isDark,
	authorName,
	editingDocumentId,
	editingTitle,
	selectedLibraryDocumentId,
	selectedLibraryProjectId,
	selectedProject,
	selectedProjectId,
	getLocationLabel,
	onFileViewModeChange,
	onSelectLibraryDocument,
	onSelectLibraryProject,
	onOpenDocument,
	onStartScratch,
	onStartGuide,
	onCreateTemplate,
	onImport,
	onAddHubFile,
	onAddHubFiles,
	onOpenHubFile,
	onStartRename,
	onCommitRename,
	onCancelRename,
	onEditingTitleChange,
	onMove,
	onDuplicate,
	onShare,
	onDelete,
	onPosterChange,
	onCreateProject,
	onOpenProjectFolder,
	onEditProject,
	onShareProject,
	onDuplicateProject,
	onDeleteProject,
}: HubSlateViewProps) {
	const hub = getHubTheme(isDark);
	const slateScripts = documents.filter(isHubScript);
	const sortedScripts = [...slateScripts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
	const isInsideFolder = selectedProject !== null;
	const folderHubFiles = documents.filter(
		(document) => document.hubKind === 'file' && document.projectId === selectedProjectId,
	);

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
		<div className="space-y-6">
			{!isInsideFolder ? (
				<HubTodayPanel
					authorName={authorName}
					documents={sortedScripts}
					isDark={isDark}
					onOpenDocument={onOpenDocument}
				/>
			) : null}

			{!isInsideFolder ? (
				<>
					<HubSectionDivider />
					<HubOrganizePanel
						allProjects={allProjects}
						documents={documents}
						isDark={isDark}
						projects={visibleProjects}
						selectedLibraryProjectId={selectedLibraryProjectId}
						selectedProjectId={selectedProjectId}
						onAddHubFile={onAddHubFile}
						onAddHubFiles={onAddHubFiles}
						onCreateProject={onCreateProject}
						onCreateTemplate={onCreateTemplate}
						onDeleteHubFile={onDelete}
						onDeleteProject={onDeleteProject}
						onDuplicateProject={onDuplicateProject}
						onEditProject={onEditProject}
						onImport={onImport}
						onMoveHubFile={onMove}
						onOpenHubFile={onOpenHubFile}
						onOpenProjectFolder={onOpenProjectFolder}
						onSelectLibraryProject={onSelectLibraryProject}
						onShareProject={onShareProject}
						onStartGuide={onStartGuide}
						onStartScratch={onStartScratch}
					/>
				</>
			) : null}

			<HubSectionDivider />

			<section>
				<div className="mb-4 flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 className={`text-lg font-semibold ${hub.panelTitle}`}>
							{isInsideFolder ? `${selectedProject?.title ?? 'Folder'} scripts` : 'Your slate'}
						</h2>
						<p className={`mt-0.5 text-sm ${hub.panelMuted}`}>
							{sortedScripts.length} {sortedScripts.length === 1 ? 'script' : 'scripts'}, sorted by last touched
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<NewScriptMenu
							isDark={isDark}
							size="sm"
							appearance="outline"
							onStartScratch={onStartScratch}
							onStartGuide={onStartGuide}
							onCreateTemplate={onCreateTemplate}
							onImport={onImport}
						/>
						{isInsideFolder ? <AddHubFileButton isDark={isDark} size="sm" onAddFile={onAddHubFile} /> : null}
						<div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
							<button
								aria-label="Poster grid"
								aria-pressed={fileViewMode === 'grid'}
								className={`inline-flex size-8 items-center justify-center rounded-md transition ${
									fileViewMode === 'grid' ? hub.filterPillActive : hub.filterPill
								}`}
								type="button"
								onClick={() => onFileViewModeChange('grid')}
							>
								<LayoutGrid size={16} />
							</button>
							<button
								aria-label="Compact list"
								aria-pressed={fileViewMode === 'list'}
								className={`inline-flex size-8 items-center justify-center rounded-md transition ${
									fileViewMode === 'list' ? hub.filterPillActive : hub.filterPill
								}`}
								type="button"
								onClick={() => onFileViewModeChange('list')}
							>
								<List size={16} />
							</button>
						</div>
					</div>
				</div>

				{isInsideFolder ? (
					<HubFileDropZone
						className="min-h-[14rem] rounded-2xl border border-dashed px-4 py-4"
						hint="Drop files into this folder"
						isDark={isDark}
						onAddFiles={handleAddFiles}
					>
						<div className="space-y-4">
							<HubFilesList
								documents={folderHubFiles}
								isDark={isDark}
								onDelete={onDelete}
								onMove={onMove}
								onOpenFile={onOpenHubFile}
							/>
							{folderHubFiles.length === 0 ? (
								<div className={`flex min-h-[5rem] items-center justify-center text-center text-sm ${hub.panelMuted}`}>
									No reference files yet. Drag files anywhere below or use Add file.
								</div>
							) : null}

							{sortedScripts.length === 0 ? (
								<div className={`rounded-2xl border border-dashed px-6 py-10 text-center ${hub.dashed}`}>
									<HubEmptyMark className="mb-4" />
									<p className={`text-sm ${hub.panelMuted}`}>No scripts in this folder yet.</p>
								</div>
							) : fileViewMode === 'grid' ? (
								<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
									{sortedScripts.map((document) => (
										<ScriptPosterCard
											key={document.id}
											authorName={authorName}
											document={document}
											isDark={isDark}
											isSelected={selectedLibraryDocumentId === document.id}
											onDelete={() => onDelete(document.id)}
											onDuplicate={() => onDuplicate(document.id)}
											onMove={() => onMove(document.id)}
											onOpen={() => onOpenDocument(document.id)}
											onPosterChange={(posterImageDataUrl) => onPosterChange(document.id, posterImageDataUrl)}
											onSelect={() => onSelectLibraryDocument(document.id)}
											onShare={() => onShare(document)}
											onStartRename={() => onStartRename(document)}
										/>
									))}
								</div>
							) : (
								<div>
									<div
										className={`${SCRIPT_LIST_GRID_WITH_LOCATION} mb-1 border-b border-border px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] uppercase ${hub.panelMuted}`}
									>
										<span>Title</span>
										<span>Folder</span>
										<span>Pages</span>
										<span>Last modified</span>
										<span className="sr-only">Actions</span>
									</div>
									<div className="divide-y divide-border">
										{sortedScripts.map((document) => (
											<ScriptListItem
												key={document.id}
												document={document}
												editingTitle={editingTitle}
												isDark={isDark}
												isEditing={editingDocumentId === document.id}
												isSelected={selectedLibraryDocumentId === document.id}
												locationLabel={getLocationLabel(document)}
												showLocationColumn
												onCancelRename={onCancelRename}
												onCommitRename={() => {
													void onCommitRename(document.id);
												}}
												onDelete={() => onDelete(document.id)}
												onDuplicate={() => onDuplicate(document.id)}
												onEditingTitleChange={onEditingTitleChange}
												onMove={() => onMove(document.id)}
												onOpen={() => onOpenDocument(document.id)}
												onSelect={() => onSelectLibraryDocument(document.id)}
												onShare={() => onShare(document)}
												onStartRename={() => onStartRename(document)}
											/>
										))}
									</div>
								</div>
							)}
						</div>
					</HubFileDropZone>
				) : sortedScripts.length === 0 ? (
					<div className={`rounded-2xl border border-dashed px-6 py-10 text-center ${hub.dashed}`}>
						<HubEmptyMark className="mb-4" />
						<p className={`text-sm ${hub.panelMuted}`}>
							{isInsideFolder ? 'No scripts in this folder yet.' : 'No scripts on your slate yet.'}
						</p>
					</div>
				) : fileViewMode === 'grid' ? (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
						{sortedScripts.map((document) => (
							<ScriptPosterCard
								key={document.id}
								authorName={authorName}
								document={document}
								isDark={isDark}
								isSelected={selectedLibraryDocumentId === document.id}
								onDelete={() => onDelete(document.id)}
								onDuplicate={() => onDuplicate(document.id)}
								onMove={() => onMove(document.id)}
								onOpen={() => onOpenDocument(document.id)}
								onPosterChange={(posterImageDataUrl) => onPosterChange(document.id, posterImageDataUrl)}
								onSelect={() => onSelectLibraryDocument(document.id)}
								onShare={() => onShare(document)}
								onStartRename={() => onStartRename(document)}
							/>
						))}
					</div>
				) : (
					<div>
						<div
							className={`${SCRIPT_LIST_GRID_WITH_LOCATION} mb-1 border-b border-border px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] uppercase ${hub.panelMuted}`}
						>
							<span>Title</span>
							<span>Folder</span>
							<span>Pages</span>
							<span>Last modified</span>
							<span className="sr-only">Actions</span>
						</div>
						<div className="divide-y divide-border">
							{sortedScripts.map((document) => (
								<ScriptListItem
									key={document.id}
									document={document}
									editingTitle={editingTitle}
									isDark={isDark}
									isEditing={editingDocumentId === document.id}
									isSelected={selectedLibraryDocumentId === document.id}
									locationLabel={getLocationLabel(document)}
									showLocationColumn
									onCancelRename={onCancelRename}
									onCommitRename={() => {
										void onCommitRename(document.id);
									}}
									onDelete={() => onDelete(document.id)}
									onDuplicate={() => onDuplicate(document.id)}
									onEditingTitleChange={onEditingTitleChange}
									onMove={() => onMove(document.id)}
									onOpen={() => onOpenDocument(document.id)}
									onSelect={() => onSelectLibraryDocument(document.id)}
									onShare={() => onShare(document)}
									onStartRename={() => onStartRename(document)}
								/>
							))}
						</div>
					</div>
				)}
			</section>
		</div>
	);
}
