import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ScreenplayProjectRecord } from '../types';

interface ProjectInfoDialogProps {
	open: boolean;
	project: ScreenplayProjectRecord | null;
	onClose: () => void;
	onSave: (updates: Pick<ScreenplayProjectRecord, 'title' | 'genre' | 'logline' | 'synopsis' | 'coverImageDataUrl'>) => void;
}

export function ProjectInfoDialog({ open, project, onClose, onSave }: ProjectInfoDialogProps) {
	const [title, setTitle] = useState('');
	const [genre, setGenre] = useState('');
	const [logline, setLogline] = useState('');
	const [synopsis, setSynopsis] = useState('');
	const [coverImageDataUrl, setCoverImageDataUrl] = useState<string | null>(null);
	const coverInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (!open || !project) {
			return;
		}

		setTitle(project.title || '');
		setGenre(project.genre || '');
		setLogline(project.logline || '');
		setSynopsis(project.synopsis || '');
		setCoverImageDataUrl(project.coverImageDataUrl ?? null);
	}, [open, project]);

	const handleCoverUpload = (file: File) => {
		if (!file.type.startsWith('image/')) {
			return;
		}

		const reader = new FileReader();

		reader.onload = () => {
			if (typeof reader.result === 'string') {
				setCoverImageDataUrl(reader.result);
			}
		};

		reader.readAsDataURL(file);
	};

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Project Info</DialogTitle>
					<DialogDescription>Title, genre, logline, synopsis, and cover image for this project.</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4">
					<label className="grid gap-2 text-sm">
						<span className="text-muted-foreground">Title</span>
						<Input value={title} onChange={(event) => setTitle(event.target.value)} />
					</label>

					<label className="grid gap-2 text-sm">
						<span className="text-muted-foreground">Genre</span>
						<Input value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="Drama, Thriller, Comedy..." />
					</label>

					<label className="grid gap-2 text-sm">
						<span className="text-muted-foreground">Logline</span>
						<textarea
							className="min-h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							value={logline}
							onChange={(event) => setLogline(event.target.value)}
							placeholder="One-sentence hook for the story"
						/>
					</label>

					<label className="grid gap-2 text-sm">
						<span className="text-muted-foreground">Synopsis</span>
						<textarea
							className="min-h-32 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							value={synopsis}
							onChange={(event) => setSynopsis(event.target.value)}
							placeholder="Short summary of the project"
						/>
					</label>

					<div className="grid gap-2 text-sm">
						<span className="text-muted-foreground">Cover</span>
						<div className="flex items-start gap-4">
							<div className="h-36 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
								{coverImageDataUrl ? (
									<img alt="Project cover preview" className="h-full w-full object-cover" src={coverImageDataUrl} />
								) : (
									<div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">No cover</div>
								)}
							</div>
							<div className="flex flex-col gap-2">
								<Button variant="outline" type="button" onClick={() => coverInputRef.current?.click()}>
									Upload image
								</Button>
								{coverImageDataUrl ? (
									<Button variant="ghost" type="button" onClick={() => setCoverImageDataUrl(null)}>
										Remove cover
									</Button>
								) : null}
								<input
									ref={coverInputRef}
									accept="image/*"
									className="hidden"
									type="file"
									onChange={(event) => {
										const file = event.target.files?.[0];

										if (file) {
											handleCoverUpload(file);
										}

										event.target.value = '';
									}}
								/>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" type="button" onClick={onClose}>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => {
							onSave({
								title: title.trim() || 'Untitled Project',
								genre: genre.trim(),
								logline: logline.trim(),
								synopsis: synopsis.trim(),
								coverImageDataUrl,
							});
						}}
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
