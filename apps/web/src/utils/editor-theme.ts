import { getAppChromeTheme } from './app-chrome-theme';

export function getEditorTheme(isDark: boolean) {
	const chrome = getAppChromeTheme(isDark);

	return {
		...chrome,
		shell: chrome.editorShell,
		tabBar: chrome.tabBar,
		main: chrome.editorMain,
		statusBar: chrome.tabBar,
		statusText: chrome.mutedText,
		statusPill: chrome.pill,
		statusButton: `${chrome.pill} disabled:opacity-40`,
		warningPill: chrome.accentPill,
		scriptPage: isDark
			? 'rounded-sm border border-border bg-card shadow-[0_30px_80px_rgba(0,0,0,0.35)]'
			: 'rounded-sm border border-border bg-white shadow-[0_30px_80px_rgba(28,25,23,0.14)]',
		compactSelect: isDark
			? 'h-8 rounded-md border border-border bg-background px-2 text-xs uppercase tracking-[0.12em] text-foreground outline-none'
			: 'h-8 rounded-md border border-border bg-card px-2 text-xs uppercase tracking-[0.12em] text-foreground outline-none',
		inspectorToggle: `rounded-md border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${chrome.pill}`,
		chatToggle: `inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] ${chrome.pill}`,
		chatToggleActive: `inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] ${chrome.accentPill}`,
		elementLabel: chrome.mutedText,
		floatingBar: isDark
			? 'border-border/80 bg-card/95 shadow-[0_20px_60px_rgba(0,0,0,0.45)]'
			: 'border-stone-400/30 bg-[#262626]/95 shadow-[0_20px_60px_rgba(0,0,0,0.35)]',
		floatingBtn: 'flex h-11 w-11 items-center justify-center text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:text-white/25',
		floatingBtnActive: 'bg-white/10 text-white',
		floatingDivider: 'h-11 w-px bg-white/10',
		sceneHighlight: isDark
			? ['bg-sky-950/50', 'outline', 'outline-1', 'outline-sky-600']
			: ['bg-sky-50', 'outline', 'outline-1', 'outline-sky-400'],
		sidebar: chrome.rail,
		sidebarHeader: `${chrome.border} ${chrome.mutedText}`,
		modeActive: chrome.pillActive,
		modeIdle: chrome.pill,
		sceneCard: isDark ? 'rounded-lg border border-border bg-card' : 'rounded-lg border border-border bg-card',
		sceneButton: isDark
			? 'grid w-full grid-cols-[42px_minmax(0,1fr)] gap-2 rounded-lg border border-border bg-card px-2 py-2 text-left text-foreground hover:border-primary/50 hover:bg-accent'
			: 'grid w-full grid-cols-[42px_minmax(0,1fr)] gap-2 rounded-lg border border-border bg-card px-2 py-2 text-left text-foreground hover:border-primary/40 hover:bg-accent',
		docActive: isDark ? 'border-primary/60 bg-primary/10' : 'border-primary/50 bg-primary/10',
		docIdle: isDark ? 'border-border bg-card hover:border-border/80' : 'border-border bg-card hover:border-border/80',
	};
}
