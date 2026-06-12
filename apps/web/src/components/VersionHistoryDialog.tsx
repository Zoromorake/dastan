import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createManualVersionSnapshot, getVersionHistory, restoreVersionSnapshot } from '../utils/screenplay-storage';
import type { ScreenplayDocumentRecord, ScreenplayVersionSnapshot } from '../types';
import { diffScreenplayContent, summarizeDiff } from '../utils/version-diff';
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
		return { lines: lines.filter((line) => line.type !== 'same').slice(0, 12), stats: summarizeDiff(lines) };
	}, [currentContent, selectedVersion]);

	const refreshVersions = async () => {
		const nextVersions = await getVersionHistory(documentId);
		setVersions(nextVersions);
	};

	useEffect(() => {
		if (!open) {
			return;
		}

		let active = true;
		setLoading(true);
		setSelectedVersionId(null);
		setConfirmRestoreId(null);

		void (async () => {
			const nextVersions = await getVersionHistory(documentId);

			if (active) {
				setVersions(nextVersions);
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
					<DialogDescription>Named checkpoints, autosaves, and a quick diff before you restore.</DialogDescription>
				</DialogHeader>

				<div className="flex gap-2">
					<Input
						placeholder="Checkpoint name (e.g. Act 1 polish)"
						value={checkpointLabel}
						onChange={(event) => setCheckpointLabel(event.target.value)}
					/>
					<Button
						type="button"
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
						Save checkpoint
					</Button>
				</div>

				<div className="grid max-h-[28rem] gap-3 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
					<div className="space-y-2">
						{loading ? <p className="text-sm text-muted-foreground">Loading versions...</p> : null}
						{!loading && versions.length === 0 ? (
							<p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
								No saved versions yet. Autosaves are created on save, or add a named checkpoint above.
							</p>
						) : null}
						{versions.map((version) => (
							<button
								key={version.id}
								className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
									selectedVersionId === version.id ? 'border-primary bg-primary/5' : ''
								}`}
								type="button"
								onClick={() => setSelectedVersionId(version.id)}
							>
								<div>
									<p className="font-medium">
										{version.label || version.title || 'Untitled'}
										{version.isManual ? (
											<span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">checkpoint</span>
										) : null}
									</p>
									<p className="text-xs text-muted-foreground">{formatVersionDate(version.savedAt)}</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										setConfirmRestoreId(version.id);
									}}
								>
									Restore
								</Button>
							</button>
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
								<pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-relaxed">
									{diffSummary.lines.map((line, index) => (
										<span
											key={`${line.type}-${index}`}
											className={
												line.type === 'added'
													? 'block text-emerald-600 dark:text-emerald-400'
													: 'block text-rose-600 line-through dark:text-rose-400'
											}
										>
											{line.type === 'added' ? '+ ' : '- '}
											{line.text || ' '}
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
