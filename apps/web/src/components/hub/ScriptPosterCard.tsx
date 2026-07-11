import { useMemo, useRef, useState } from 'react';
import type { ScreenplayDocumentRecord } from '../../types';
import { formatPageCount, formatRuntimeEstimate } from '../../utils/runtime-estimate';
import { countPagesFromContent } from '../../utils/screenplay-pagination';
import { getActiveRevisionColor, getRevisionDotColor } from '../../utils/hub-script-meta';
import { getHubTheme } from '../../utils/hub-theme';
import { cn } from '@/lib/utils';
import { ScriptActionsMenu, useScriptContextMenu } from './ScriptActionsMenu';
import type { HubItemActionsMenuHandle } from './HubItemActionsMenu';
import { ImageCropDialog } from '../ImageCropDialog';
import { readFileAsDataUrl } from '../../utils/image-crop';

interface ScriptPosterCardProps {
	document: ScreenplayDocumentRecord;
	authorName: string;
	isDark: boolean;
	isSelected: boolean;
	onSelect: () => void;
	onOpen: () => void;
	onStartRename: () => void;
	onDuplicate: () => void;
	onShare: () => void;
	onMove: () => void;
	onDelete: () => void;
	onPosterChange: (posterImageDataUrl: string | null) => void;
}

function PosterThumbnail({
	title,
	authorName,
	posterImageDataUrl,
}: {
	title: string;
	authorName: string;
	posterImageDataUrl?: string | null;
}) {
	if (posterImageDataUrl) {
		return (
			<div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl border-b border-black/5 bg-muted">
				<img alt="" className="size-full object-cover" src={posterImageDataUrl} />
			</div>
		);
	}

	return (
		<div
			className="relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-t-xl border-b border-black/5 bg-paper-bright px-3 py-4 text-slate-900 shadow-inner"
			style={{
				backgroundImage:
					'linear-gradient(145deg, rgba(255,255,255,0.35), transparent 55%), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.015) 3px)',
			}}
		>
			<div className="flex flex-1 flex-col items-center justify-start pt-[14%] text-center">
				<p className="line-clamp-4 font-[family-name:var(--font-screenplay)] text-xs leading-snug font-bold tracking-wide uppercase">
					{title}
				</p>
				<p className="mt-3 font-[family-name:var(--font-screenplay)] text-[9px] tracking-[0.12em] text-slate-600 uppercase">
					written by
				</p>
				<p className="mt-1 line-clamp-2 font-[family-name:var(--font-screenplay)] text-[10px] text-slate-700">
					{authorName}
				</p>
			</div>
		</div>
	);
}

export function ScriptPosterCard({
	document,
	authorName,
	isDark,
	isSelected,
	onSelect: _onSelect,
	onOpen,
	onStartRename,
	onDuplicate,
	onShare,
	onMove,
	onDelete,
	onPosterChange,
}: ScriptPosterCardProps) {
	const hub = getHubTheme(isDark);
	const title = document.title || 'Untitled';
	const menuRef = useRef<HubItemActionsMenuHandle>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const handleContextMenu = useScriptContextMenu(menuRef);
	const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
	const pageCount = useMemo(
		() => countPagesFromContent(document.content),
		[document.id, document.updatedAt],
	);
	const revisionColor = getActiveRevisionColor(document);

	const openPosterPicker = () => {
		fileInputRef.current?.click();
	};

	return (
		<article
			role="button"
			tabIndex={0}
			aria-label={`Open ${title}`}
			aria-current={isSelected ? 'true' : undefined}
			className={cn(
				'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition duration-200 outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
				isSelected
					? 'border-gold/50 bg-gold/5 ring-1 ring-gold/25'
					: `${hub.card} hover:-translate-y-0.5 hover:border-gold/30`,
			)}
			onClick={onOpen}
			onContextMenu={handleContextMenu}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					onOpen();
				}
			}}
		>
			<PosterThumbnail
				authorName={authorName}
				posterImageDataUrl={document.posterImageDataUrl}
				title={title}
			/>

			<div className="flex items-center justify-between gap-2 px-2.5 py-2">
				<div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
					<span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">{formatPageCount(pageCount)}</span>
					<span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">{formatRuntimeEstimate(pageCount)}</span>
					{document.workspace?.guide?.active ||
					(document.workspace?.guide?.furthestStep && document.workspace.guide.furthestStep !== 'finish') ? (
						<span className="rounded-full bg-gold/10 px-2 py-0.5 font-medium tracking-wide text-gold uppercase">
							Guide
						</span>
					) : null}
					{revisionColor ? (
						<span
							className="inline-flex size-2.5 shrink-0 rounded-full border border-black/10"
							style={{ backgroundColor: getRevisionDotColor(revisionColor) }}
							title={`Revision: ${revisionColor}`}
						/>
					) : null}
				</div>

				<div onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
					<ScriptActionsMenu
						ref={menuRef}
						hasPoster={Boolean(document.posterImageDataUrl)}
						title={title}
						onDuplicate={onDuplicate}
						onMove={onMove}
						onRemovePoster={() => onPosterChange(null)}
						onRename={onStartRename}
						onSetPoster={openPosterPicker}
						onShare={onShare}
						onTrash={onDelete}
					/>
				</div>
			</div>

			<input
				ref={fileInputRef}
				accept="image/*"
				className="hidden"
				type="file"
				onChange={(event) => {
					const file = event.target.files?.[0];
					event.target.value = '';

					if (!file) {
						return;
					}

					void readFileAsDataUrl(file).then((dataUrl) => setCropImageSrc(dataUrl));
				}}
			/>

			<ImageCropDialog
				aspectRatio={2 / 3}
				cropHeight={360}
				cropWidth={240}
				description="Crop your poster to a 2:3 ratio."
				imageSrc={cropImageSrc}
				open={Boolean(cropImageSrc)}
				outputHeight={900}
				outputWidth={600}
				title="Poster art"
				onClose={() => setCropImageSrc(null)}
				onComplete={(dataUrl) => {
					setCropImageSrc(null);
					onPosterChange(dataUrl);
				}}
			/>
		</article>
	);
}
