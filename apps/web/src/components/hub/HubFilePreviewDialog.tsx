import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import type { ScreenplayDocumentRecord } from '../../types';
import { downloadHubFile, formatHubFileSize, isHubFile } from '../../utils/hub-item-kind';
import {
	canPreviewHubFileAttachment,
	getHubFilePreviewKind,
	readHubFileTextContent,
} from '../../utils/hub-file-preview';
import { getHubTheme } from '../../utils/hub-theme';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface HubFilePreviewDialogProps {
	document: ScreenplayDocumentRecord | null;
	isDark: boolean;
	onClose: () => void;
}

export function HubFilePreviewDialog({ document, isDark, onClose }: HubFilePreviewDialogProps) {
	const hub = getHubTheme(isDark);
	const attachment = document?.hubFile ?? null;
	const previewKind = attachment ? getHubFilePreviewKind(attachment) : 'none';
	const [textContent, setTextContent] = useState<string | null>(null);
	const [textError, setTextError] = useState<string | null>(null);

	useEffect(() => {
		if (!attachment || previewKind !== 'text') {
			setTextContent(null);
			setTextError(null);
			return;
		}

		let cancelled = false;

		void readHubFileTextContent(attachment)
			.then((content) => {
				if (!cancelled) {
					setTextContent(content);
					setTextError(null);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setTextContent(null);
					setTextError('Could not read this text file in the browser.');
				}
			});

		return () => {
			cancelled = true;
		};
	}, [attachment, previewKind]);

	if (!document || !isHubFile(document) || !attachment) {
		return null;
	}

	const canPreview = canPreviewHubFileAttachment(attachment);

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<DialogContent
				className={cn(
					'max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-4xl',
					isDark ? 'bg-card text-foreground' : undefined,
				)}
			>
				<DialogHeader>
					<DialogTitle className="truncate pr-8">{attachment.fileName}</DialogTitle>
					<DialogDescription className={hub.panelMuted}>
						{formatHubFileSize(attachment.byteSize)}
						{attachment.mimeType ? ` · ${attachment.mimeType}` : null}
					</DialogDescription>
				</DialogHeader>

				<div className="max-h-[min(70vh,720px)] overflow-auto rounded-xl border border-border bg-muted/20">
					{previewKind === 'image' ? (
						<img
							alt={attachment.fileName}
							className="mx-auto block max-h-[min(70vh,720px)] w-full object-contain"
							src={attachment.dataUrl}
						/>
					) : null}

					{previewKind === 'pdf' ? (
						<iframe
							className="h-[min(70vh,720px)] w-full bg-white"
							src={attachment.dataUrl}
							title={attachment.fileName}
						/>
					) : null}

					{previewKind === 'text' ? (
						<pre className="overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap text-foreground">
							{textError ?? textContent ?? 'Loading…'}
						</pre>
					) : null}

					{previewKind === 'audio' ? (
						<div className="flex items-center justify-center p-8">
							<audio controls className="w-full max-w-xl" src={attachment.dataUrl}>
								Your browser does not support audio playback.
							</audio>
						</div>
					) : null}

					{previewKind === 'video' ? (
						<video controls className="max-h-[min(70vh,720px)] w-full bg-black" src={attachment.dataUrl}>
							Your browser does not support video playback.
						</video>
					) : null}

					{!canPreview ? (
						<div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
							<p className={`text-sm ${hub.panelMuted}`}>This file type cannot be previewed in the browser.</p>
							<Button type="button" variant="outline" onClick={() => downloadHubFile(document)}>
								<Download size={16} />
								Download file
							</Button>
						</div>
					) : null}
				</div>

				<DialogFooter className="gap-2 sm:justify-between">
					<p className={`text-xs ${hub.panelMuted}`}>
						{canPreview ? 'Previewing locally — nothing leaves your device.' : 'Download to open this file.'}
					</p>
					<Button type="button" variant="outline" onClick={() => downloadHubFile(document)}>
						<Download size={16} />
						Download
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
