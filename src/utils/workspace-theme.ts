export function getWorkspaceTheme(isDark: boolean) {
	return {
		page: isDark ? 'text-slate-100' : 'text-stone-900',
		panel: isDark
			? 'rounded-2xl border border-slate-700 bg-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.25)]'
			: 'rounded-2xl border border-stone-300 bg-white/95 shadow-[0_20px_50px_rgba(28,25,23,0.08)]',
		muted: isDark ? 'text-slate-400' : 'text-stone-500',
		heading: isDark ? 'text-slate-100' : 'text-stone-900',
		card: isDark ? 'rounded-xl border border-slate-700 bg-slate-900/70' : 'rounded-xl border border-stone-200 bg-stone-50/80',
		cardHover: isDark ? 'hover:border-slate-600 hover:bg-slate-800' : 'hover:border-stone-300 hover:bg-white',
		input: isDark
			? 'rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-amber-500/60'
			: 'rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-amber-400',
		textarea: isDark
			? 'w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-amber-500/60'
			: 'w-full rounded-lg border border-stone-200 bg-white p-3 text-sm leading-6 text-stone-800 outline-none placeholder:text-stone-400 focus:border-amber-400',
		chip: isDark
			? 'rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-300'
			: 'rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-stone-600',
		button: isDark
			? 'rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700'
			: 'rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50',
		buttonAccent: isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800',
		empty: isDark
			? 'rounded-xl border border-dashed border-slate-600 bg-slate-900/50 p-6 text-sm text-slate-400'
			: 'rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500',
		stat: isDark ? 'rounded-xl border border-slate-700 bg-slate-900/60 p-4' : 'rounded-xl border border-stone-200 bg-stone-50 p-4',
		divider: isDark ? 'border-slate-700' : 'border-stone-200',
	};
}
