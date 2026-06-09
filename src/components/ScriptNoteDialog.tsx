import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ScreenplayScriptNote } from '../types';

interface ScriptNoteDialogProps {
	open: boolean;
	blockIndex: number;
	blockLabel: string;
	existingNote: ScreenplayScriptNote | null;
	isDark: boolean;
	onClose: () => void;
	onSave: (body: string) => void;
	onDelete: () => void;
}

export function ScriptNoteDialog({
	open,
	blockIndex,
	blockLabel,
	existingNote,
	isDark,
	onClose,
	onSave,
	onDelete,
}: ScriptNoteDialogProps) {
	const [body, setBody] = useState('');

	useEffect(() => {
		if (!open) {
			return;
		}

		setBody(existingNote?.body ?? '');
	}, [existingNote?.body, open]);

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
			<DialogContent className={isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : undefined}>
				<DialogHeader>
					<DialogTitle className={isDark ? 'text-slate-100' : undefined}>Script Note</DialogTitle>
					<DialogDescription className={isDark ? 'text-slate-400' : undefined}>
						Attach a note to block {blockIndex + 1}: {blockLabel}
					</DialogDescription>
				</DialogHeader>

				<textarea
					autoFocus
					className={`min-h-36 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 ${
						isDark
							? 'border-slate-600 bg-slate-800 text-slate-100 focus-visible:ring-amber-600/50'
							: 'border-stone-300 bg-white text-stone-900 focus-visible:ring-amber-400/60'
					}`}
					placeholder="Production note, revision note, or reminder..."
					value={body}
					onChange={(event) => setBody(event.target.value)}
				/>

				<DialogFooter className="gap-2 sm:justify-between">
					{existingNote ? (
						<Button variant="destructive" type="button" onClick={onDelete}>
							Delete Note
						</Button>
					) : (
						<span />
					)}
					<div className="flex gap-2">
						<Button variant="outline" type="button" onClick={onClose}>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={() => {
								onSave(body.trim());
							}}
						>
							Save Note
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
