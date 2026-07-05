import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
	createManualVersionSnapshot,
	deleteVersionSnapshot,
	getVersionHistory,
	restoreVersionSnapshot,
} from '../utils/screenplay-storage';
import type { ScreenplayDocumentRecord, ScreenplayVersionSnapshot } from '../types';
import { diffScreenplayContent, summarizeDiff } from '../utils/version-diff';
import { restoreRemovedLineToContent } from '../utils/version-restore-hunk';
import { useScreenplayStore } from '../store';

interface VersionHistoryDialogProps {
	open: boolean;
	documentId: string;
	currentContent: ScreenplayDocumentRecord['content'] | null;
	onRestored: () => void;
	onClose: () => void;
}

function formatVersionDate(timestamp: string): string {
	return new Date(timestamp).toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

export function VersionHistoryDialog({ open, documentId, currentContent, onRestored, onClose }: VersionHistoryDialogProps) {
	const [versions, setVersions] = useState<ScreenplayVersionSnapshot[]>([]);
	const [loading, setLoading] = useState(false);
	const [checkpointLabel, setCheckpointLabel] = useState('');
	const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
	const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const currentDocument = useScreenplayStore((state) => state.currentDocument);

	const selectedVersion = useMemo(
		() => versions.find((version) => version.id === selectedVersionId) ?? null,
		[selectedVersionId, versions],
	);

	const diffSummary = useMemo(() => {
		if (!selectedVersion) {
			return null;
		}

		const lines = diffScreenplayContent(currentContent, selectedVersion.content);
		return { lines: lines.filter((line) => line.type !== 'same').slice(0, 40), stats: summarizeDiff(lines) };
	}, [currentContent, selectedVersion]);

	const refreshVersions = async () => {
		const nextVersions = await getVersionHistory(documentId);
		setVersions(nextVersions.sort((left, right) => right.savedAt.localeCompare(left.savedAt)));
	};

	useEffect(() => {
		if (!open) {
			return;
		}

		let active = true;
		setLoading(true);
		setSelectedVersionId(null);
		setConfirmRestoreId(null);
		setConfirmDeleteId(null);

		void (async () => {
			const nextVersions = await getVersionHistory(documentId);

			if (active) {
				setVersions(nextVersions.sort((left, right) => right.savedAt.localeCompare(left.savedAt)));
				setLoading(false);
			}
		})();

		return () => {
			active = false;
		};
	}, [documentId, open]);

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Version History</DialogTitle>
					<DialogDescription>
						Named checkpoints are saved on demand. Automatic snapshots are created every 10 minutes of active editing (and before AI edits).
					</DialogDescription>
				</DialogHeader>

				<div className="flex gap-2">
					<Input
						placeholder="Version name (e.g. Draft 2, Blue revision)"
						value={checkpointLabel}
						onChange={(event) => setCheckpointLabel(event.target.value)}
					/>
					<Button
						type="button"
						disabled={checkpointLabel.trim().length === 0}
						onClick={() => {
							if (!currentDocument) {
								return;
							}

							void (async () => {
								await createManualVersionSnapshot(currentDocument, checkpointLabel);
								setCheckpointLabel('');
								await refreshVersions();
							})();
						}}
					>
						Save version
					</Button>
				</div>

				<div className="grid max-h-[28rem] gap-3 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
					<div className="space-y-2">
						{loading ? <p className="text-sm text-muted-foreground">Loading versions...</p> : null}
						{!loading && versions.length === 0 ? (
							<p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
								No saved versions yet. Name and save a version when you want to keep a snapshot of this draft.
							</p>
						) : null}
						{!loading && versions.length > 0 ? (
							<p className="text-xs text-muted-foreground">Most recent first</p>
						) : null}
						{versions.map((version) => (
							<div
								key={version.id}
								className={`rounded-xl border transition ${
									selectedVersionId === version.id ? 'border-primary bg-primary/5' : ''
								}`}
							>
								<div
									className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
									role="button"
									tabIndex={0}
									onClick={() => setSelectedVersionId(version.id)}
									onKeyDown={(event) => {
										if (event.key === 'Enter' || event.key === ' ') {
											event.preventDefault();
											setSelectedVersionId(version.id);
										}
									}}
								>
									<div>
										<p className="font-medium">
											{version.isManual === false
												? version.label || 'Automatic snapshot'
												: version.label || version.title || 'Untitled'}
										</p>
										<p className="text-xs text-muted-foreground">
											{formatVersionDate(version.savedAt)}
											{version.isManual === false ? ' · Auto' : version.label ? ' · Checkpoint' : ''}
										</p>
									</div>
									<div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
										<Button
											variant="outline"
											size="sm"
											type="button"
											onClick={() => {
												setConfirmDeleteId(null);
												setConfirmRestoreId(version.id);
											}}
										>
											Restore
										</Button>
										<Button
											variant="ghost"
											size="sm"
											type="button"
											className="size-8 px-0 text-muted-foreground hover:text-destructive"
											aria-label="Delete version"
											onClick={() => {
												setConfirmRestoreId(null);
												setConfirmDeleteId(version.id);
											}}
										>
											<Trash2 size={14} />
										</Button>
									</div>
								</div>

								{confirmDeleteId === version.id ? (
									<div
										className="border-t px-4 py-3 text-sm"
										onClick={(event) => event.stopPropagation()}
									>
										<p className="text-muted-foreground">Delete this version? This cannot be undone.</p>
										<div className="mt-2 flex gap-2">
											<Button
												variant="destructive"
												size="sm"
												type="button"
												onClick={() => {
													void (async () => {
														await deleteVersionSnapshot(version.id);
														if (selectedVersionId === version.id) {
															setSelectedVersionId(null);
														}

														setConfirmDeleteId(null);
														await refreshVersions();
													})();
												}}
											>
												Delete
											</Button>
											<Button variant="outline" size="sm" type="button" onClick={() => setConfirmDeleteId(null)}>
												Cancel
											</Button>
										</div>
									</div>
								) : null}
							</div>
						))}
					</div>

					<div className="rounded-xl border p-4">
						<p className="mb-2 text-sm font-medium">Diff preview</p>
						{!selectedVersion ? (
							<p className="text-sm text-muted-foreground">Select a version to compare against the current script.</p>
						) : null}
						{selectedVersion && diffSummary ? (
							<>
								<p className="mb-3 text-xs text-muted-foreground">
									{diffSummary.stats.added} lines added · {diffSummary.stats.removed} lines removed
								</p>
								<pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-relaxed">
									{diffSummary.lines.map((line, index) => (
										<span
											key={`${line.type}-${index}`}
											className={
												line.type === 'added'
													? 'group block text-emerald-600 dark:text-emerald-400'
													: 'group block text-rose-600 line-through dark:text-rose-400'
											}
										>
											{line.type === 'added' ? '+ ' : '- '}
											{line.text || ' '}
											{line.type === 'removed' && selectedVersion ? (
												<button
													type="button"
													className="ml-2 hidden rounded border px-1.5 py-0.5 text-[10px] no-underline group-hover:inline"
													onClick={() => {
														if (!currentDocument) {
															return;
														}

														void (async () => {
															await createManualVersionSnapshot(currentDocument, 'Before passage restore');
															const nextContent = restoreRemovedLineToContent(
																currentContent ?? { type: 'doc', content: [] },
																selectedVersion.content,
																line.text,
															);
															useScreenplayStore.getState().setDocumentContent(nextContent);
															onRestored();
														})();
													}}
												>
													Restore this passage
												</button>
											) : null}
										</span>
									))}
								</pre>
							</>
						) : null}
					</div>
				</div>

				{confirmRestoreId ? (
					<div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-950/30">
						<p className="font-medium">Restore this version?</p>
						<p className="mt-1 text-muted-foreground">Your current script will be replaced. You can still find it in version history.</p>
						<div className="mt-3 flex gap-2">
							<Button
								type="button"
								onClick={() => {
									void (async () => {
										await restoreVersionSnapshot(confirmRestoreId);
										setConfirmRestoreId(null);
										onRestored();
										onClose();
									})();
								}}
							>
								Confirm restore
							</Button>
							<Button variant="outline" type="button" onClick={() => setConfirmRestoreId(null)}>
								Cancel
							</Button>
						</div>
					</div>
				) : null}

				<DialogFooter>
					<Button variant="outline" type="button" onClick={onClose}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
