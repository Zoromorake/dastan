export function getEditorTheme(isDark: boolean) {
	return {
		shell: isDark ? 'bg-slate-900 text-slate-100' : 'bg-[#ece7dc] text-stone-900',
		tabBar: isDark ? 'border-slate-700 bg-slate-800' : 'border-stone-300 bg-[#f3eee4]',
		main: isDark ? 'bg-slate-900' : 'bg-[#e9e3d6]',
		statusBar: isDark ? 'border-slate-700 bg-slate-800' : 'border-stone-300 bg-[#f3eee4]',
		statusText: isDark ? 'text-slate-400' : 'text-stone-500',
		statusPill: isDark
			? 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
			: 'border-stone-300 bg-white text-stone-600 hover:border-stone-400',
		statusButton: isDark
			? 'border-slate-600 bg-slate-700 text-slate-200 disabled:opacity-40'
			: 'border-stone-300 bg-white text-stone-700 disabled:opacity-40',
		warningPill: isDark
			? 'border-amber-700/60 bg-amber-950/40 text-amber-300'
			: 'border-amber-300 bg-amber-50 text-amber-700',
		scriptPage: isDark
			? 'rounded-sm border border-slate-600 bg-slate-800 shadow-[0_30px_80px_rgba(0,0,0,0.35)]'
			: 'rounded-sm border border-stone-300 bg-white shadow-[0_30px_80px_rgba(28,25,23,0.14)]',
		compactSelect: isDark
			? 'h-8 rounded-md border border-slate-600 bg-slate-900 px-2 text-xs uppercase tracking-[0.12em] text-slate-200 outline-none'
			: 'h-8 rounded-md border border-stone-300 bg-white px-2 text-xs uppercase tracking-[0.12em] text-stone-700 outline-none',
		inspectorToggle: isDark
			? 'rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300 hover:border-slate-500'
			: 'rounded-md border border-stone-300 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-600 hover:border-stone-500 hover:text-stone-900',
		chatToggle: isDark
			? 'inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-slate-300 hover:border-amber-600/60 hover:text-amber-200'
			: 'inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-600 hover:border-amber-400 hover:text-stone-900',
		chatToggleActive: isDark
			? 'inline-flex items-center gap-1.5 rounded-md border border-amber-600/70 bg-amber-950/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-amber-200'
			: 'inline-flex items-center gap-1.5 rounded-md border border-amber-400 bg-amber-50 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-900',
		elementLabel: isDark ? 'text-slate-400' : 'text-stone-500',
		floatingBar: isDark
			? 'border-slate-600/80 bg-slate-800/95 shadow-[0_20px_60px_rgba(0,0,0,0.45)]'
			: 'border-stone-400/30 bg-[#262626]/95 shadow-[0_20px_60px_rgba(0,0,0,0.35)]',
		floatingBtn: 'flex h-12 w-12 items-center justify-center text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:text-white/25',
		floatingBtnActive: 'bg-white/10 text-white',
		floatingDivider: 'h-12 w-px bg-white/10',
		sceneHighlight: isDark
			? ['bg-sky-950/50', 'outline', 'outline-1', 'outline-sky-600']
			: ['bg-sky-50', 'outline', 'outline-1', 'outline-sky-400'],
	};
}
