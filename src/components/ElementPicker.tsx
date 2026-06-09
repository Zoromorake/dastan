import { useEffect, useRef, useState } from 'react';
import {
	AlignCenter,
	AlignLeft,
	ArrowRight,
	Camera,
	Check,
	ChevronDown,
	Clapperboard,
	MessageSquare,
	Music2,
	Parentheses,
	Pilcrow,
	UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SCREENPLAY_BLOCK_TYPES, type ScreenplayBlockType } from '../types';

export const blockTypeIcons: Record<ScreenplayBlockType, LucideIcon> = {
	scene_heading: Clapperboard,
	action: AlignLeft,
	character: UserRound,
	dialogue: MessageSquare,
	parenthetical: Parentheses,
	transition: ArrowRight,
	centered: AlignCenter,
	shot: Camera,
	general: Pilcrow,
	lyrics: Music2,
};

interface ElementPickerProps {
	value: ScreenplayBlockType;
	labels: Record<ScreenplayBlockType, string>;
	isDark: boolean;
	onChange: (blockType: ScreenplayBlockType) => void;
	variant?: 'header' | 'toolbar';
	fullWidth?: boolean;
}

export function ElementPicker({ value, labels, isDark, onChange, variant = 'header', fullWidth = false }: ElementPickerProps) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const CurrentIcon = blockTypeIcons[value];

	useEffect(() => {
		const handleMouseDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};

		window.addEventListener('mousedown', handleMouseDown);
		return () => window.removeEventListener('mousedown', handleMouseDown);
	}, []);

	const widthClass = fullWidth ? 'w-full' : '';
	const triggerClass =
		variant === 'header'
			? isDark
				? `flex h-8 items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/90 px-2.5 text-sm text-slate-100 shadow-sm transition hover:border-slate-500 hover:bg-slate-800 ${widthClass} ${fullWidth ? 'justify-between' : ''}`
				: `flex h-8 items-center gap-2 rounded-lg border border-stone-300/90 bg-white/95 px-2.5 text-sm text-stone-800 shadow-sm transition hover:border-stone-400 hover:bg-stone-50 ${widthClass} ${fullWidth ? 'justify-between' : ''}`
			: 'flex h-12 min-w-[8.5rem] items-center gap-2 px-3 text-white/85 transition-colors hover:bg-white/10 hover:text-white';

	const menuZIndex = variant === 'header' ? 'z-[200]' : 'z-50';
	const menuClass = isDark
		? `absolute ${menuZIndex} min-w-[13.5rem] overflow-hidden rounded-xl border border-slate-600 bg-slate-900 py-1 shadow-xl`
		: `absolute ${menuZIndex} min-w-[13.5rem] overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl`;

	const itemClass = (active: boolean) =>
		isDark
			? `flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${active ? 'bg-slate-800 text-slate-100' : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'}`
			: `flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${active ? 'bg-stone-100 text-stone-900' : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900'}`;

	const menuPosition =
		variant === 'header'
			? fullWidth
				? 'left-0 top-[calc(100%+6px)]'
				: 'left-1/2 top-[calc(100%+6px)] -translate-x-1/2'
			: 'bottom-[calc(100%+8px)] left-0';

	return (
		<div ref={rootRef} className={`relative ${variant === 'header' ? 'z-[200]' : ''} ${fullWidth ? 'w-full' : ''}`}>
			<button
				aria-expanded={open}
				aria-haspopup="listbox"
				aria-label="Current element"
				className={triggerClass}
				type="button"
				onMouseDown={(event) => event.preventDefault()}
				onClick={() => setOpen((current) => !current)}
			>
				<CurrentIcon size={variant === 'header' ? 15 : 18} strokeWidth={2.1} />
				<span className="max-w-[7rem] truncate font-medium">{labels[value]}</span>
				<ChevronDown size={14} className={variant === 'header' ? (isDark ? 'text-slate-400' : 'text-stone-400') : 'text-white/50'} />
			</button>

			{open ? (
				<div className={`${menuClass} ${menuPosition}`} role="listbox">
					{SCREENPLAY_BLOCK_TYPES.map((blockType) => {
						const Icon = blockTypeIcons[blockType];
						const active = blockType === value;

						return (
							<button
								key={blockType}
								aria-selected={active}
								className={itemClass(active)}
								role="option"
								type="button"
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => {
									onChange(blockType);
									setOpen(false);
								}}
							>
								<Icon size={15} strokeWidth={2.1} className={isDark ? 'text-slate-400' : 'text-stone-500'} />
								<span className="flex-1">{labels[blockType]}</span>
								{active ? <Check size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} /> : <span className="w-3.5" />}
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
