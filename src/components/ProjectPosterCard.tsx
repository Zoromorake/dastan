import { Folder } from 'lucide-react';
import type { ScreenplayProjectRecord } from '../types';

interface ProjectPosterCardProps {
	project: ScreenplayProjectRecord;
	itemCount: number;
	isSelected: boolean;
	isDark: boolean;
	onSelect: () => void;
	onOpen: () => void;
}

export function ProjectPosterCard({ project, itemCount, isSelected, isDark, onSelect, onOpen }: ProjectPosterCardProps) {
	return (
		<article
			className={`flex h-[200px] w-36 shrink-0 cursor-pointer flex-col overflow-hidden rounded-lg border-2 transition ${
				isSelected
					? 'border-sky-500 ring-2 ring-sky-500/30'
					: isDark
						? 'border-slate-600 hover:border-slate-500'
						: 'border-stone-200 hover:border-stone-300'
			}`}
			onClick={onSelect}
			onDoubleClick={(event) => {
				event.preventDefault();
				onOpen();
			}}
		>
			<div className={`relative min-h-0 flex-1 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-stone-200'}`}>
				{project.coverImageDataUrl ? (
					<img alt="" className="absolute inset-0 h-full w-full object-cover object-center" src={project.coverImageDataUrl} />
				) : (
					<div className={`flex h-full flex-col items-center justify-center gap-1.5 px-2 text-center text-[11px] ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
						<Folder size={22} strokeWidth={1.5} />
						<span>No cover</span>
					</div>
				)}
			</div>
			<div className={`shrink-0 border-t px-2.5 py-2 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-stone-700 bg-stone-900'}`}>
				<p className="truncate text-xs font-medium leading-tight text-slate-100" title={project.title || 'Untitled Project'}>
					{project.title || 'Untitled Project'}
				</p>
				<p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] leading-tight text-slate-400">
					<Folder size={11} className="shrink-0" />
					<span className="truncate">
						{itemCount} {itemCount === 1 ? 'Item' : 'Items'}
					</span>
				</p>
			</div>
		</article>
	);
}
