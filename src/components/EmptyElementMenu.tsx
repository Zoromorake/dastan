import { SCREENPLAY_BLOCK_TYPES, type ScreenplayBlockType } from '../types';
import { blockTypeIcons } from './ElementPicker';

interface EmptyElementMenuProps {
	anchorTop: number;
	anchorLeft: number;
	highlightIndex: number;
	labels: Record<ScreenplayBlockType, string>;
	isDark: boolean;
	onSelect: (blockType: ScreenplayBlockType) => void;
	onHighlightIndexChange: (index: number) => void;
}

export function EmptyElementMenu({
	anchorTop,
	anchorLeft,
	highlightIndex,
	labels,
	isDark,
	onSelect,
	onHighlightIndexChange,
}: EmptyElementMenuProps) {
	const panelClass = isDark
		? 'overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-xl'
		: 'overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xl';

	const itemClass = (highlighted: boolean) =>
		highlighted
			? isDark
				? 'bg-slate-800 text-slate-100'
				: 'bg-amber-50 text-stone-900'
			: isDark
				? 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
				: 'text-stone-700 hover:bg-stone-50 hover:text-stone-900';

	const iconClass = isDark ? 'text-slate-400' : 'text-stone-500';

	return (
		<div
			className="pointer-events-none absolute z-40"
			style={{ top: anchorTop, left: Math.max(0, anchorLeft) }}
			role="listbox"
			aria-label="Choose element"
		>
			<ul className={`pointer-events-auto max-h-64 w-[min(15rem,calc(100vw-3rem))] overflow-y-auto py-1 ${panelClass}`}>
				{SCREENPLAY_BLOCK_TYPES.map((blockType, index) => {
					const Icon = blockTypeIcons[blockType];
					const highlighted = index === highlightIndex;

					return (
						<li key={blockType}>
							<button
								aria-selected={highlighted}
								className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${itemClass(highlighted)}`}
								role="option"
								type="button"
								onMouseDown={(event) => event.preventDefault()}
								onMouseEnter={() => onHighlightIndexChange(index)}
								onClick={() => onSelect(blockType)}
							>
								<Icon size={15} strokeWidth={2.1} className={iconClass} />
								<span>{labels[blockType]}</span>
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
