import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface CommandPaletteItem {
	id: string;
	label: string;
	keywords?: string;
	group: string;
	recent?: boolean;
	run: () => void;
}

interface CommandPaletteProps {
	open: boolean;
	items: CommandPaletteItem[];
	onOpenChange: (open: boolean) => void;
}

const RECENT_KEY = 'dastan.command-palette.recent';

function loadRecentIds(): string[] {
	try {
		const raw = window.localStorage.getItem(RECENT_KEY);
		return raw ? (JSON.parse(raw) as string[]) : [];
	} catch {
		return [];
	}
}

function saveRecentId(id: string): void {
	const recent = loadRecentIds().filter((entry) => entry !== id);
	recent.unshift(id);
	window.localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 8)));
}

function scoreItem(item: CommandPaletteItem, query: string): number {
	if (query.length === 0) {
		return item.recent ? 2 : 1;
	}

	const haystack = `${item.label} ${item.keywords ?? ''}`.toLowerCase();
	const normalized = query.toLowerCase();

	if (item.label.toLowerCase() === normalized) {
		return 100;
	}

	if (item.label.toLowerCase().startsWith(normalized)) {
		return 80;
	}

	if (haystack.includes(normalized)) {
		return 50;
	}

	return 0;
}

export function CommandPalette({ open, items, onOpenChange }: CommandPaletteProps) {
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);

	const filtered = useMemo(() => {
		const recentIds = new Set(loadRecentIds());
		const scored = items
			.map((item) => ({
				item: { ...item, recent: recentIds.has(item.id) },
				score: scoreItem(item, query.trim()),
			}))
			.filter((entry) => entry.score > 0 || query.trim().length === 0)
			.sort((left, right) => right.score - left.score || left.item.label.localeCompare(right.item.label));

		return scored.map((entry) => entry.item);
	}, [items, query]);

	useEffect(() => {
		setActiveIndex(0);
	}, [query, open]);

	const runItem = useCallback(
		(item: CommandPaletteItem) => {
			saveRecentId(item.id);
			onOpenChange(false);
			setQuery('');
			item.run();
		},
		[onOpenChange],
	);

	useEffect(() => {
		if (!open) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				setActiveIndex((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)));
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault();
				setActiveIndex((current) => Math.max(current - 1, 0));
			}

			if (event.key === 'Enter' && filtered[activeIndex]) {
				event.preventDefault();
				runItem(filtered[activeIndex]!);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [activeIndex, filtered, open, runItem]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
				<DialogHeader className="border-b px-4 py-3">
					<DialogTitle className="sr-only">Command palette</DialogTitle>
					<Input
						autoFocus
						className="border-0 shadow-none focus-visible:ring-0"
						placeholder="Search scripts and commands…"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</DialogHeader>
				<ul className="max-h-80 overflow-y-auto py-2" role="listbox">
					{filtered.length === 0 ? (
						<li className="px-4 py-6 text-center text-sm text-muted-foreground">No matches</li>
					) : (
						filtered.map((item, index) => (
							<li key={item.id}>
								<button
									className={cn(
										'flex w-full items-center justify-between px-4 py-2 text-left text-sm',
										index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60',
									)}
									role="option"
									type="button"
									onClick={() => runItem(item)}
								>
									<span>{item.label}</span>
									<span className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.group}</span>
								</button>
							</li>
						))
					)}
				</ul>
			</DialogContent>
		</Dialog>
	);
}

export function useCommandPaletteHotkey(onOpen: () => void): void {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				onOpen();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onOpen]);
}

export function useCommandPaletteNavigation() {
	const navigate = useNavigate();
	return navigate;
}
