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
	onAddReply: (author: string, body: string) => void;
	onDelete: () => void;
}

function formatReplyTimestamp(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

export function ScriptNoteDialog({
	open,
	blockIndex,
	blockLabel,
	existingNote,
	isDark,
	onClose,
	onAddReply,
	onDelete,
}: ScriptNoteDialogProps) {
	const [author, setAuthor] = useState('You');
	const [body, setBody] = useState('');

	useEffect(() => {
		if (!open) {
			return;
		}

		setAuthor('You');
		setBody('');
	}, [open, existingNote?.id]);

	const replies = existingNote?.replies ?? [];
	const noteNumber = replies.length > 0 ? 1 : null;
	const panelClass = isDark ? 'border-slate-700 bg-slate-800/70' : 'border-stone-200 bg-stone-50';
	const inputClass = isDark
		? 'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-amber-600/50'
		: 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus-visible:ring-amber-400/60';
	const replyClass = isDark ? 'rounded-xl border border-slate-700 bg-slate-900/80 p-3' : 'rounded-xl border border-stone-200 bg-white p-3';
	const mutedClass = isDark ? 'text-slate-400' : 'text-stone-500';

	const handleSubmit = () => {
		const trimmedBody = body.trim();

		if (trimmedBody.length === 0) {
			return;
		}

		onAddReply(author.trim() || 'You', trimmedBody);
		setBody('');
	};

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
			<DialogContent className={`max-h-[85vh] overflow-hidden sm:max-w-lg ${isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : ''}`}>
				<DialogHeader>
					<DialogTitle className={isDark ? 'text-slate-100' : undefined}>Script Note</DialogTitle>
					<DialogDescription className={isDark ? 'text-slate-400' : undefined}>
						Block {blockIndex + 1}: {blockLabel}
					</DialogDescription>
				</DialogHeader>

				<div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
					{replies.length === 0 ? (
						<div className={`rounded-xl border p-4 text-sm ${panelClass}`}>
							<p className={`font-medium ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>No notes yet</p>
							<p className={`mt-1 leading-6 ${mutedClass}`}>
								Add note 1 below to start a thread. Teammates can reply here with their own notes.
							</p>
						</div>
					) : (
						<div className={`rounded-xl border p-3 ${panelClass}`}>
							<p className={`mb-3 text-xs font-semibold uppercase tracking-[0.16em] ${mutedClass}`}>
								Note {noteNumber}
							</p>
							<div className="space-y-3">
								{replies.map((reply, index) => (
									<div key={reply.id} className={replyClass}>
										<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
											<span className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
												{reply.author}
												{index === 0 ? ' · Original' : ' · Reply'}
											</span>
											<span className={`text-[11px] ${mutedClass}`}>{formatReplyTimestamp(reply.createdAt)}</span>
										</div>
										<p className="whitespace-pre-wrap text-sm leading-6">{reply.body}</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				<div className={`space-y-3 rounded-xl border p-4 ${panelClass}`}>
					<p className={`text-xs font-semibold uppercase tracking-[0.16em] ${mutedClass}`}>
						{replies.length === 0 ? 'Add note 1' : 'Add reply'}
					</p>
					<label className="block text-xs">
						<span className={mutedClass}>Author</span>
						<input
							className={`${inputClass} mt-1`}
							placeholder="Your name"
							value={author}
							onChange={(event) => setAuthor(event.target.value)}
						/>
					</label>
					<textarea
						autoFocus
						className={`${inputClass} min-h-28`}
						placeholder={replies.length === 0 ? 'Write the first script note…' : 'Write a reply…'}
						value={body}
						onChange={(event) => setBody(event.target.value)}
						onKeyDown={(event) => {
							if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
								event.preventDefault();
								handleSubmit();
							}
						}}
					/>
				</div>

				<DialogFooter className="gap-2 sm:justify-between">
					{existingNote && replies.length > 0 ? (
						<Button variant="destructive" type="button" onClick={onDelete}>
							Delete Thread
						</Button>
					) : (
						<span />
					)}
					<div className="flex gap-2">
						<Button variant="outline" type="button" onClick={onClose}>
							Close
						</Button>
						<Button type="button" disabled={body.trim().length === 0} onClick={handleSubmit}>
							{replies.length === 0 ? 'Add Note 1' : 'Add Reply'}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
