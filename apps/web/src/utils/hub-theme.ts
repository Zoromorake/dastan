import { getAppChromeTheme } from './app-chrome-theme';

export function getSettingsTheme(isDark: boolean) {
	const chrome = getAppChromeTheme(isDark);

	return {
		shell: isDark
			? 'border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.45)]'
			: 'border-border bg-card shadow-[0_24px_80px_rgba(15,23,42,0.18)]',
		sidebar: isDark ? 'border-border bg-muted/50' : 'border-border bg-muted/40',
		content: 'bg-card',
		title: chrome.panelTitle,
		muted: chrome.panelMuted,
		label: chrome.panelTitle,
		navActive: 'bg-accent text-accent-foreground',
		navItem: 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
		field: 'rounded-lg border border-input bg-background text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
		surface: isDark ? 'rounded-xl border border-border bg-muted/40' : 'rounded-xl border border-border bg-muted/30',
		themePicker: 'bg-muted',
		themeOptionActive: isDark
			? 'border-primary bg-accent text-primary'
			: 'border-primary bg-background text-primary shadow-sm',
		themeOption: 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
	};
}

export function getHubTheme(isDark: boolean) {
	const chrome = getAppChromeTheme(isDark);

	return {
		...chrome,
		shell: chrome.shell,
		sidebar: chrome.hubSidebar,
		panel: `border-b ${chrome.border}`,
		panelTitle: chrome.panelTitle,
		panelMuted: chrome.panelMuted,
		card: chrome.card,
		cardActive: isDark ? 'border-primary/60 ring-1 ring-primary/30' : 'border-primary/50 ring-1 ring-primary/20',
		dashed: chrome.dashed,
		accentButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
		ghostButton: `${chrome.pill}`,
		selectionBar: isDark ? 'border border-border bg-muted/50' : 'border border-border bg-muted/40',
		iconButton: 'text-muted-foreground hover:text-foreground',
		navActive: 'border-l-2 border-primary bg-accent font-medium text-foreground',
		navItem: 'border-l-2 border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground',
		createMenu: 'border border-border bg-popover text-popover-foreground',
		filterPillActive: isDark ? 'bg-gold/15 text-gold' : 'bg-gold/10 text-amber-800',
		filterPill: 'text-muted-foreground hover:bg-accent hover:text-foreground',
	};
}
