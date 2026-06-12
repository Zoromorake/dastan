import type { SmartTypeSuggestionItem, SmartTypeSuggestions as SmartTypeResult } from '../utils/smarttype';

interface SmartTypeSuggestionsProps {
	suggestions: SmartTypeResult;
	anchorTop: number;
	anchorLeft: number;
	highlightIndex: number;
	isDark: boolean;
	onSelect: (item: SmartTypeSuggestionItem) => void;
	onHighlightIndexChange?: (index: number) => void;
}

export function SmartTypeSuggestions({
	suggestions,
	anchorTop,
	anchorLeft,
	highlightIndex,
	isDark,
	onSelect,
	onHighlightIndexChange,
}: SmartTypeSuggestionsProps) {
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

	if (suggestions.phase === 'none' || suggestions.items.length === 0) {
		return null;
	}

	return (
		<div
			className="pointer-events-none absolute z-30"
			style={{ top: anchorTop, left: Math.max(0, anchorLeft) }}
			role="listbox"
			aria-label={suggestions.sectionLabel}
		>
			<ul className={`pointer-events-auto max-h-52 w-[min(16rem,calc(100vw-3rem))] overflow-y-auto py-1 ${panelClass}`}>
				{suggestions.items.map((item, index) => (
					<li key={`${item.group}-${item.value}`}>
						<button
							aria-selected={index === highlightIndex}
							className={`block w-full px-3 py-2 text-left font-mono text-sm transition ${itemClass(index === highlightIndex)}`}
							role="option"
							type="button"
							onMouseDown={(event) => event.preventDefault()}
							onMouseEnter={() => onHighlightIndexChange?.(index)}
							onClick={() => onSelect(item)}
						>
							{item.value}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
