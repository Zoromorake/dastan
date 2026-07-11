import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import type { JSONContent } from '@tiptap/core';
import type {
	ScreenplaySceneReference,
	ScreenplayVersionSnapshot,
	ScreenplayWorkspaceData,
} from '../types';
import type { DevelopSubTab, WorldSubTab, WorkspaceMode } from '../types/workspace-navigation';
import { getCharactersForScene } from '../utils/scene-cast';
import { getStructureBeatForBlockIndex } from '../utils/structure-line-spans';
import { getEditorTheme } from '../utils/editor-theme';
import { getVersionHistory } from '../utils/screenplay-storage';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type EditorNavigatorSection =
	| 'script'
	| 'basics'
	| 'structure'
	| 'outline'
	| 'beats'
	| 'treatment'
	| 'characters'
	| 'locations'
	| 'notes'
	| 'versions';

interface EditorNavigatorProps {
	collapsed: boolean;
	workspaceMode: WorkspaceMode;
	developSubTab: DevelopSubTab;
	worldSubTab: WorldSubTab;
	navigatorFocus?: EditorNavigatorSection | null;
	scenes: ScreenplaySceneReference[];
	activeSceneIndex?: number;
	documentId: string;
	documentTitle: string;
	documentContent: JSONContent | null;
	workspace: ScreenplayWorkspaceData;
	resolvedTheme: 'light' | 'dark';
	onToggleCollapsed: () => void;
	onShowVersions: () => void;
	onSceneSelect: (sceneIndex: number) => void;
	onOpenVersionHistory: () => void;
	onRestoreVersion: (versionId: string) => void;
}

function getActiveSection(
	workspaceMode: WorkspaceMode,
	developSubTab: DevelopSubTab,
	worldSubTab: WorldSubTab,
): EditorNavigatorSection {
	if (workspaceMode === 'script') {
		return 'script';
	}

	if (workspaceMode === 'develop') {
		return developSubTab;
	}

	if (workspaceMode === 'world') {
		return worldSubTab;
	}

	return 'script';
}

function getPanelTitle(section: EditorNavigatorSection): string {
	switch (section) {
		case 'script':
			return 'Scenes';
		case 'versions':
			return 'Versions';
		case 'basics':
			return 'Basics';
		case 'structure':
			return 'Structure';
		case 'outline':
			return 'Outline';
		case 'beats':
			return 'Beat Board';
		case 'treatment':
			return 'Treatment';
		case 'characters':
			return 'Characters';
		case 'locations':
			return 'Locations';
		case 'notes':
			return 'Notes';
		default:
			return 'Navigator';
	}
}

function formatRelativeDate(timestamp: string): string {
	const now = new Date();
	const date = new Date(timestamp);
	const diffMs = now.getTime() - date.getTime();
	const hourMs = 60 * 60 * 1000;
	const dayMs = 24 * hourMs;

	if (diffMs < hourMs) {
		const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
		return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
	}

	if (diffMs < dayMs) {
		const hours = Math.floor(diffMs / hourMs);
		return `${hours} hour${hours === 1 ? '' : 's'} ago`;
	}

	if (diffMs < dayMs * 2) {
		return 'Yesterday';
	}

	return date.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
}

function formatVersionLabel(version: ScreenplayVersionSnapshot): string {
	if (version.label && version.label.trim().length > 0) {
		return version.label.trim();
	}

	return version.title?.trim() || 'Untitled version';
}

function truncateText(value: string, maxLength: number): string {
	const trimmed = value.trim();

	if (trimmed.length <= maxLength) {
		return trimmed;
	}

	return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function EditorNavigator({
	collapsed,
	workspaceMode,
	developSubTab,
	worldSubTab,
	navigatorFocus = null,
	scenes,
	activeSceneIndex = -1,
	documentId,
	documentTitle,
	documentContent,
	workspace,
	resolvedTheme,
	onToggleCollapsed,
	onShowVersions,
	onSceneSelect,
	onOpenVersionHistory,
	onRestoreVersion,
}: EditorNavigatorProps) {
	const isDark = resolvedTheme === 'dark';
	const theme = getEditorTheme(isDark);
	const activeSection = navigatorFocus ?? getActiveSection(workspaceMode, developSubTab, worldSubTab);
	const panelTitle = getPanelTitle(activeSection);
	const [versions, setVersions] = useState<ScreenplayVersionSnapshot[]>([]);
	const [versionsLoading, setVersionsLoading] = useState(false);
	const [pendingRestoreVersion, setPendingRestoreVersion] = useState<ScreenplayVersionSnapshot | null>(null);
	const [expandedScenes, setExpandedScenes] = useState<Record<number, boolean>>({});
	const showStructureLines = workspace.viewOptions?.showStructureLines ?? false;

	useEffect(() => {
		if (collapsed || activeSection !== 'versions') {
			return;
		}

		let active = true;
		setVersionsLoading(true);

		void (async () => {
			const nextVersions = await getVersionHistory(documentId);

			if (active) {
				setVersions(nextVersions);
				setVersionsLoading(false);
			}
		})();

		return () => {
			active = false;
		};
	}, [activeSection, collapsed, documentId]);

	const renderSceneList = () => (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden text-sm text-foreground">
			<div
				className={`grid shrink-0 grid-cols-[2.25rem_minmax(0,1fr)] gap-2 border-b px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.sidebarHeader}`}
			>
				<span className="text-center">#</span>
				<span>Scene</span>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				{scenes.length === 0 ? (
					<p className={`px-3 py-4 text-sm ${theme.statusText}`}>No scenes yet.</p>
				) : (
					<div className="divide-y divide-border/70">
						{scenes.map((scene, index) => {
							const isActive = index === activeSceneIndex;
							const cast = getCharactersForScene(documentContent, index);
							const expanded = expandedScenes[index] ?? false;
							const structureBeat = showStructureLines
								? getStructureBeatForBlockIndex(documentContent, workspace.development.structureBeats, scene.index)
								: null;

							return (
							<div
								key={`${scene.index}-${index}`}
								className={`px-2 py-2.5 ${isActive ? `${theme.modeActive} ring-1 ring-inset ring-primary/40` : 'hover:bg-accent/60'}`}
							>
								<button
									aria-current={isActive ? 'true' : undefined}
									className={`grid w-full grid-cols-[2.25rem_minmax(0,1fr)] gap-2 text-left transition ${
										isActive ? 'font-semibold' : ''
									}`}
									type="button"
									onClick={() => onSceneSelect(scene.index)}
								>
									<span
										className={`pt-0.5 text-center text-xs font-semibold tabular-nums ${
											isActive ? 'text-primary' : theme.statusText
										}`}
									>
										{index + 1}
									</span>
									<span className={`flex min-w-0 items-center gap-1 truncate text-sm leading-snug ${isActive ? 'text-foreground' : ''}`}>
										{showStructureLines && structureBeat ? (
											<span
												className="inline-block size-2 shrink-0 rounded-full"
												style={{ backgroundColor: structureBeat.color }}
												title={structureBeat.label}
											/>
										) : null}
										{scene.text.length > 0 ? scene.text : 'Untitled scene'}
									</span>
								</button>
								{cast.length > 0 ? (
									<button
										type="button"
										aria-expanded={expanded}
										className={`mt-1 ml-10 flex items-center gap-1 text-[10px] ${theme.statusText}`}
										onClick={() => {
											setExpandedScenes((current) => ({ ...current, [index]: !expanded }));
										}}
									>
										{expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
										{cast.length} character{cast.length === 1 ? '' : 's'}
									</button>
								) : null}
								{expanded && cast.length > 0 ? (
									<p className={`mt-1 ml-10 text-[10px] leading-relaxed ${theme.statusText}`}>{cast.join(', ')}</p>
								) : null}
							</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);

	const renderSectionPreview = () => {
		const { development, beatBoard, characterProfiles, locationProfiles, globalNotes } = workspace;
		const characterNames = Object.keys(characterProfiles);
		const locationNames = Object.keys(locationProfiles);

		switch (activeSection) {
			case 'basics':
				return (
					<div className="space-y-3 p-3 text-sm">
						<p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.statusText}`}>Project</p>
						<p className="font-medium">{documentTitle}</p>
						{development.basics.logline.trim() ? (
							<p className={`leading-relaxed ${theme.statusText}`}>
								{truncateText(development.basics.logline, 180)}
							</p>
						) : (
							<p className={theme.statusText}>Add a logline in the main panel.</p>
						)}
					</div>
				);
			case 'structure':
				return (
					<div className="space-y-3 p-3 text-sm">
						<p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.statusText}`}>Template</p>
						<p className="capitalize">{development.structureTemplate.replace(/-/g, ' ')}</p>
						<p className={theme.statusText}>
							{development.structureBeats.length} structure beat
							{development.structureBeats.length === 1 ? '' : 's'}
						</p>
					</div>
				);
			case 'outline':
				return renderSceneList();
			case 'beats':
				return (
					<div className="min-h-0 flex-1 overflow-y-auto p-2">
						{beatBoard.length === 0 ? (
							<p className={`px-1 py-2 text-sm ${theme.statusText}`}>No beats on the board yet.</p>
						) : (
							<div className="space-y-2">
								{beatBoard.map((card) => (
									<div key={card.id} className={`rounded-lg border px-2.5 py-2 ${theme.docIdle}`}>
										<p className="truncate text-sm font-medium">{card.heading || 'Untitled beat'}</p>
										{card.beat.trim() ? (
											<p className={`mt-0.5 truncate text-xs ${theme.statusText}`}>{card.beat}</p>
										) : null}
									</div>
								))}
							</div>
						)}
					</div>
				);
			case 'treatment':
				return (
					<div className="p-3 text-sm leading-relaxed">
						{development.treatment.trim() ? (
							<p className={theme.statusText}>{truncateText(development.treatment, 320)}</p>
						) : (
							<p className={theme.statusText}>Treatment is empty — start writing in the main panel.</p>
						)}
					</div>
				);
			case 'characters':
				return (
					<div className="min-h-0 flex-1 overflow-y-auto p-2">
						{characterNames.length === 0 ? (
							<p className={`px-1 py-2 text-sm ${theme.statusText}`}>No character profiles yet.</p>
						) : (
							<div className="space-y-2">
								{characterNames.map((name) => (
									<div key={name} className={`rounded-lg border px-2.5 py-2 ${theme.docIdle}`}>
										<p className="truncate text-sm font-medium">{name}</p>
										{characterProfiles[name]?.arc?.trim() ? (
											<p className={`mt-0.5 truncate text-xs ${theme.statusText}`}>
												{characterProfiles[name]?.arc}
											</p>
										) : null}
									</div>
								))}
							</div>
						)}
					</div>
				);
			case 'locations':
				return (
					<div className="min-h-0 flex-1 overflow-y-auto p-2">
						{locationNames.length === 0 ? (
							<p className={`px-1 py-2 text-sm ${theme.statusText}`}>No location profiles yet.</p>
						) : (
							<div className="space-y-2">
								{locationNames.map((name) => (
									<div key={name} className={`rounded-lg border px-2.5 py-2 ${theme.docIdle}`}>
										<p className="truncate text-sm font-medium">{name}</p>
									</div>
								))}
							</div>
						)}
					</div>
				);
			case 'notes':
				return (
					<div className="p-3 text-sm leading-relaxed">
						{globalNotes.trim() ? (
							<p className={theme.statusText}>{truncateText(globalNotes, 320)}</p>
						) : (
							<p className={theme.statusText}>Global notes are empty.</p>
						)}
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<>
			{!collapsed ? (
				<button
					aria-label="Close sidebar"
					className="fixed inset-0 z-30 bg-black/30 md:hidden"
					type="button"
					onClick={onToggleCollapsed}
				/>
			) : null}
			<aside
				className={`flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r transition-all duration-200 ${theme.sidebar} ${collapsed ? 'w-12' : 'w-64 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-xl'}`}
			>
				<div className={`flex h-11 items-center gap-1 border-b px-2 text-xs uppercase tracking-[0.14em] ${theme.sidebarHeader}`}>
					{!collapsed ? <span className="min-w-0 truncate">{panelTitle}</span> : null}
					{!collapsed && activeSection !== 'versions' ? (
						<button
							aria-label="Show versions"
							className={`ml-auto rounded-md border p-1 ${theme.statusPill}`}
							title="Versions"
							type="button"
							onClick={onShowVersions}
						>
							<History size={12} />
						</button>
					) : null}
					<button
						aria-expanded={!collapsed}
						aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
						className={`${collapsed ? 'mx-auto' : ''} rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${theme.statusPill}`}
						type="button"
						onClick={onToggleCollapsed}
					>
						{collapsed ? '›' : '‹'}
					</button>
				</div>

				{!collapsed ? (
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
						{activeSection === 'script' ? renderSceneList() : null}

						{activeSection === 'versions' ? (
							<div className="flex min-h-0 flex-1 flex-col overflow-hidden text-sm text-foreground">
								<div className="shrink-0 border-b px-2 py-2">
									<button
										className={`block w-full rounded-md border px-2 py-2 text-left text-[10px] uppercase tracking-[0.12em] ${theme.statusPill}`}
										type="button"
										onClick={onOpenVersionHistory}
									>
										Open version history
									</button>
								</div>

								<div className="min-h-0 flex-1 overflow-y-auto p-2">
									{versionsLoading ? <p className={`text-sm ${theme.statusText}`}>Loading versions…</p> : null}
									{!versionsLoading && versions.length === 0 ? (
										<p className={`text-sm ${theme.statusText}`}>No saved versions yet.</p>
									) : null}
									{!versionsLoading && versions.length > 0 ? (
										<div className="space-y-2">
											{versions.map((version) => (
												<button
													key={version.id}
													className={`block w-full rounded-lg border px-2.5 py-2 text-left transition ${theme.docIdle} hover:bg-accent/40`}
													type="button"
													onClick={() => setPendingRestoreVersion(version)}
												>
													<span className="block truncate text-sm font-medium">{formatVersionLabel(version)}</span>
													<span className={`mt-0.5 block truncate text-[10px] uppercase tracking-[0.12em] ${theme.statusText}`}>
														{formatRelativeDate(version.savedAt)}
													</span>
												</button>
											))}
										</div>
									) : null}
								</div>
							</div>
						) : null}

						{activeSection !== 'script' && activeSection !== 'versions' ? (
							<div className="flex min-h-0 flex-1 flex-col overflow-hidden">{renderSectionPreview()}</div>
						) : null}
					</div>
				) : (
					<div className="flex flex-1 flex-col items-center gap-2 py-3">
						<button
							aria-label="Show versions"
							className={`flex size-8 items-center justify-center rounded-md border ${theme.modeIdle}`}
							title="Versions"
							type="button"
							onClick={() => {
								onShowVersions();
								onToggleCollapsed();
							}}
						>
							<History size={14} strokeWidth={1.75} />
						</button>
					</div>
				)}
			</aside>

			<AlertDialog
				open={pendingRestoreVersion !== null}
				onOpenChange={(open) => {
					if (!open) {
						setPendingRestoreVersion(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Restore this version?</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingRestoreVersion
								? `Restore "${formatVersionLabel(pendingRestoreVersion)}" from ${formatRelativeDate(pendingRestoreVersion.savedAt)}? Unsaved changes will be lost.`
								: null}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (pendingRestoreVersion) {
									onRestoreVersion(pendingRestoreVersion.id);
									setPendingRestoreVersion(null);
								}
							}}
						>
							Restore
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
