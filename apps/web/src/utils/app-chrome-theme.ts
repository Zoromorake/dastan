/** Shared surface tokens for hub, editor, and workspace chrome. */
export function getAppChromeTheme(isDark: boolean) {
	return {
		shell: 'bg-background text-foreground',
		surface: 'bg-card text-card-foreground',
		surfaceMuted: isDark ? 'bg-muted/40' : 'bg-muted/30',
		border: 'border-border',
		mutedText: 'text-muted-foreground',
		topBar: isDark ? 'border-border bg-ink-soft/80' : 'border-border bg-[#f6f2ea]',
		tabBar: isDark ? 'border-border bg-ink-soft/90' : 'border-border bg-[#f3eee4]',
		editorShell: isDark ? 'bg-ink text-foreground' : 'bg-[#ece7dc] text-foreground',
		editorMain: isDark ? 'bg-ink-soft/70' : 'bg-[#e9e3d6]',
		rail: isDark ? 'border-border bg-ink-soft/90' : 'border-border bg-[#f6f2ea]',
		hubSidebar: isDark ? 'bg-ink-soft text-foreground' : 'bg-[#f5e8c8] text-neutral-950',
		pill: isDark
			? 'border-border bg-muted/50 text-muted-foreground hover:border-gold/30 hover:bg-accent hover:text-accent-foreground'
			: 'border-border bg-card text-muted-foreground hover:border-gold/40 hover:bg-accent hover:text-accent-foreground',
		pillActive: isDark
			? 'border-gold/45 bg-gold/10 text-foreground'
			: 'border-gold/40 bg-gold/10 text-foreground',
		accentPill: isDark
			? 'border-gold/35 bg-gold/10 text-foreground'
			: 'border-gold/40 bg-gold/10 text-foreground',
		warningBanner: isDark
			? 'border-gold/35 bg-gold/10 text-foreground'
			: 'border-gold/40 bg-gold/10 text-amber-950',
		input: isDark
			? 'border-border bg-background text-foreground'
			: 'border-border bg-card text-foreground',
		panelTitle: 'text-foreground',
		panelMuted: 'text-muted-foreground',
		card: isDark
			? 'border border-border bg-card hover:border-gold/25 hover:shadow-sm'
			: 'border border-border bg-card hover:border-gold/30 hover:shadow-sm',
		dashed: isDark ? 'border-dashed border-border bg-muted/20' : 'border-dashed border-border bg-muted/30',
	};
}
