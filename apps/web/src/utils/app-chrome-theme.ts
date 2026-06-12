/** Shared surface tokens for hub, editor, and workspace chrome. */
export function getAppChromeTheme(isDark: boolean) {
	return {
		shell: 'bg-background text-foreground',
		surface: 'bg-card text-card-foreground',
		surfaceMuted: isDark ? 'bg-muted/40' : 'bg-muted/30',
		border: 'border-border',
		mutedText: 'text-muted-foreground',
		topBar: isDark ? 'border-border bg-background' : 'border-border bg-[#f6f2ea]',
		tabBar: isDark ? 'border-border bg-card' : 'border-border bg-[#f3eee4]',
		editorShell: isDark ? 'bg-background text-foreground' : 'bg-[#ece7dc] text-foreground',
		editorMain: isDark ? 'bg-muted/20' : 'bg-[#e9e3d6]',
		rail: isDark ? 'border-border bg-card' : 'border-border bg-[#f6f2ea]',
		hubSidebar: isDark ? 'bg-slate-900 text-amber-400' : 'bg-[#f5e8c8] text-neutral-950',
		pill: isDark
			? 'border-border bg-muted text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground'
			: 'border-border bg-card text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground',
		pillActive: isDark
			? 'border-primary/60 bg-primary/10 text-foreground'
			: 'border-primary/50 bg-primary/10 text-foreground',
		accentPill: isDark
			? 'border-amber-700/60 bg-amber-950/40 text-amber-200'
			: 'border-amber-400 bg-amber-50 text-foreground',
		warningBanner: isDark
			? 'border-amber-700/60 bg-amber-950/40 text-amber-100'
			: 'border-amber-300 bg-amber-50 text-amber-900',
		input: isDark
			? 'border-border bg-background text-foreground'
			: 'border-border bg-card text-foreground',
		panelTitle: 'text-foreground',
		panelMuted: 'text-muted-foreground',
		card: isDark
			? 'border border-border bg-card hover:border-border/80 hover:shadow-sm'
			: 'border border-border bg-card hover:border-zinc-300 hover:shadow-sm',
		dashed: isDark ? 'border-dashed border-border bg-muted/20' : 'border-dashed border-border bg-muted/30',
	};
}
