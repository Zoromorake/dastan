import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getVersionHistory, restoreVersionSnapshot } from '../utils/screenplay-storage';
import type { ScreenplayVersionSnapshot } from '../types';

interface VersionHistoryDialogProps {
	open: boolean;
	documentId: string;
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

export function VersionHistoryDialog({ open, documentId, onRestored, onClose }: VersionHistoryDialogProps) {
	const [versions, setVersions] = useState<ScreenplayVersionSnapshot[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open) {
			return;
		}

		let active = true;
		setLoading(true);

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
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Version History</DialogTitle>
					<DialogDescription>Restore a previous save of this script.</DialogDescription>
				</DialogHeader>
				<div className="max-h-80 space-y-2 overflow-y-auto">
					{loading ? <p className="text-sm text-muted-foreground">Loading versions...</p> : null}
					{!loading && versions.length === 0 ? (
						<p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No saved versions yet. Versions are created each time you save.</p>
					) : null}
					{versions.map((version) => (
						<div key={version.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
							<div>
								<p className="font-medium">{version.title || 'Untitled'}</p>
								<p className="text-xs text-muted-foreground">{formatVersionDate(version.savedAt)}</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								type="button"
								onClick={() => {
									void (async () => {
										await restoreVersionSnapshot(version.id);
										onRestored();
										onClose();
									})();
								}}
							>
								Restore
							</Button>
						</div>
					))}
				</div>
				<DialogFooter>
					<Button variant="outline" type="button" onClick={onClose}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
