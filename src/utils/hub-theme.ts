export function getSettingsTheme(isDark: boolean) {
	return {
		shell: isDark
			? 'border-slate-700 bg-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.45)]'
			: 'border-stone-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]',
		sidebar: isDark ? 'border-slate-700 bg-slate-800/80' : 'border-stone-200 bg-stone-50',
		content: isDark ? 'bg-slate-900' : 'bg-white',
		title: isDark ? 'text-slate-100' : 'text-stone-900',
		muted: isDark ? 'text-slate-400' : 'text-stone-500',
		label: isDark ? 'text-slate-200' : 'text-stone-800',
		navActive: isDark ? 'bg-slate-700 text-slate-100' : 'bg-stone-200 text-stone-900',
		navItem: isDark ? 'text-slate-400 hover:bg-slate-700/70 hover:text-slate-200' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
		field: isDark
			? 'rounded-lg border border-slate-600 bg-slate-800 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-amber-600/50'
			: 'rounded-lg border border-stone-300 bg-white text-stone-900 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
		surface: isDark ? 'rounded-xl border border-slate-700 bg-slate-800/60' : 'rounded-xl border border-stone-200 bg-stone-50',
		themePicker: isDark ? 'bg-slate-800' : 'bg-stone-100',
		themeOptionActive: isDark
			? 'border-amber-600 bg-slate-700 text-amber-400'
			: 'border-amber-400 bg-white text-amber-700 shadow-sm',
		themeOption: isDark
			? 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200'
			: 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700',
	};
}

export function getHubTheme(isDark: boolean) {
	return {
		panel: isDark
			? 'rounded-2xl border border-slate-700/80 bg-slate-800/90'
			: 'rounded-2xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)]',
		panelTitle: isDark ? 'text-slate-200' : 'text-neutral-900',
		panelMuted: isDark ? 'text-slate-400' : 'text-stone-500',
		card: isDark ? 'border-slate-600 bg-slate-800 hover:border-slate-500' : 'border-stone-200 bg-stone-50 hover:border-stone-300',
		dashed: isDark ? 'border-slate-600 bg-slate-800/40' : 'border-stone-300 bg-stone-50',
		accentButton: isDark ? 'bg-amber-600 text-slate-100 hover:bg-amber-500' : 'bg-amber-400 text-neutral-950 hover:bg-amber-300',
		selectionBar: isDark ? 'border border-slate-700 bg-slate-800' : 'border border-stone-200 bg-stone-100',
		iconButton: isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-800',
		navActive: isDark ? 'bg-slate-700 font-semibold text-slate-200' : 'bg-[#dfd3bb] font-semibold text-stone-800',
		navItem: isDark ? 'text-slate-400 hover:bg-slate-700/80 hover:text-slate-200' : 'text-stone-500 hover:bg-white hover:text-stone-800',
		sidebarCard: isDark ? 'border-slate-600 bg-slate-800' : 'border-stone-300 bg-white',
		createMenu: isDark ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-stone-300 bg-white',
		fileAction: isDark
			? 'rounded-md border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:border-slate-500'
			: 'rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:border-stone-400',
		fileActionDanger: isDark
			? 'rounded-md border border-rose-900/60 bg-rose-950/40 px-3 py-1 text-xs font-medium text-rose-300 hover:border-rose-800'
			: 'rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:border-rose-300',
	};
}
