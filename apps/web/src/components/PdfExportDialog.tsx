import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getEditorTheme } from '../utils/editor-theme';

interface PdfExportDialogProps {
	open: boolean;
	resolvedTheme: 'light' | 'dark';
	revisionModeActive: boolean;
	onClose: () => void;
	onConfirm: (includeChangeMarks: boolean) => void;
}

export function PdfExportDialog({
	open,
	resolvedTheme,
	revisionModeActive,
	onClose,
	onConfirm,
}: PdfExportDialogProps) {
	const isDark = resolvedTheme === 'dark';
	const theme = getEditorTheme(isDark);
	const [includeChangeMarks, setIncludeChangeMarks] = useState(false);

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onClose();
				}
			}}
		>
			<DialogContent className={`max-w-sm ${theme.surface}`}>
				<DialogHeader>
					<DialogTitle>Export PDF</DialogTitle>
				</DialogHeader>
				<label className={`flex items-center gap-2 text-sm ${theme.statusText}`}>
					<input
						checked={includeChangeMarks}
						className="size-4 rounded accent-amber-600"
						type="checkbox"
						onChange={(event) => setIncludeChangeMarks(event.target.checked)}
					/>
					Include change marks in right margin
				</label>
				{revisionModeActive ? (
					<p className={`text-xs ${theme.statusText}`}>
						Revision header, history box, and colored border are included automatically in revision mode.
					</p>
				) : null}
				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => {
							onConfirm(includeChangeMarks);
							onClose();
						}}
					>
						Export
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
