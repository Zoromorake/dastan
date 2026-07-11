import { FileImage, FileText, FileType, Trash2 } from 'lucide-react';
import type { ScreenplayDocumentRecord } from '../../types';
import { getHubTheme } from '../../utils/hub-theme';
import { formatHubFileSize, isHubFile } from '../../utils/hub-item-kind';
import { getHubFilePreviewKind } from '../../utils/hub-file-preview';
import { cn } from '@/lib/utils';

interface HubFilesListProps {
	documents: ScreenplayDocumentRecord[];
	isDark: boolean;
	onOpenFile: (document: ScreenplayDocumentRecord) => void;
	onDelete: (documentId: string) => void;
	onMove: (documentId: string) => void;
}

function HubFileIcon({
	previewKind,
	className,
}: {
	previewKind: ReturnType<typeof getHubFilePreviewKind>;
	className?: string;
}) {
	if (previewKind === 'image') {
		return <FileImage className={className} />;
	}

	if (previewKind === 'pdf') {
		return <FileType className={className} />;
	}

	return <FileText className={className} />;
}

export function HubFilesList({ documents, isDark, onOpenFile, onDelete, onMove }: HubFilesListProps) {
	const hub = getHubTheme(isDark);
	const files = documents.filter(isHubFile);

	if (files.length === 0) {
		return null;
	}

	return (
		<div>
			<h3 className={cn('mb-2 text-xs font-medium uppercase tracking-[0.12em]', hub.panelMuted)}>Files</h3>
			<ul className="divide-y divide-border rounded-xl border border-border">
				{files.map((document) => {
					const attachment = document.hubFile;
					const label = attachment?.fileName ?? document.title;
					const previewKind = attachment ? getHubFilePreviewKind(attachment) : 'none';

					return (
						<li key={document.id} className="group flex items-center gap-3 px-3 py-2.5">
							{previewKind === 'image' && attachment ? (
								<div className="size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
									<img alt="" className="size-full object-cover" src={attachment.dataUrl} />
								</div>
							) : (
								<div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/60">
									<HubFileIcon className="size-4 text-muted-foreground" previewKind={previewKind} />
								</div>
							)}
							<button
								className="min-w-0 flex-1 text-left"
								type="button"
								onClick={() => onOpenFile(document)}
							>
								<span className={cn('block truncate text-sm', hub.panelTitle)}>{label}</span>
								{attachment ? (
									<span className={cn('text-[11px]', hub.panelMuted)}>
										{formatHubFileSize(attachment.byteSize)}
										{previewKind !== 'none' ? ' · Click to preview' : ' · Click to download'}
									</span>
								) : null}
							</button>
							<div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
								<button
									className={cn('rounded px-2 py-1 text-[10px] uppercase tracking-[0.1em]', hub.ghostButton)}
									type="button"
									onClick={() => onMove(document.id)}
								>
									Move
								</button>
								<button
									aria-label={`Delete ${label}`}
									className="rounded p-1 text-muted-foreground hover:text-red-500"
									type="button"
									onClick={() => onDelete(document.id)}
								>
									<Trash2 size={14} />
								</button>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
