import { getAppChromeTheme } from './app-chrome-theme';

export function getWorkspaceTheme(isDark: boolean) {
	const chrome = getAppChromeTheme(isDark);

	return {
		page: 'text-foreground',
		panel: `rounded-xl border ${chrome.border} bg-card/95 shadow-sm`,
		muted: chrome.mutedText,
		heading: chrome.panelTitle,
		card: `rounded-xl border ${chrome.border} bg-card/80`,
		cardHover: 'hover:border-border/80 hover:bg-accent/40',
		input: `rounded-lg border ${chrome.border} bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40`,
		textarea: `w-full rounded-lg border ${chrome.border} bg-background p-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40`,
		chip: `rounded-full border ${chrome.border} bg-muted px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground`,
		button: `rounded-lg border ${chrome.border} bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent`,
		buttonAccent: isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800',
		empty: `rounded-xl border border-dashed ${chrome.border} bg-muted/30 p-6 text-sm ${chrome.mutedText}`,
		stat: `rounded-xl border ${chrome.border} bg-card/80 p-4`,
		divider: chrome.border,
	};
}
