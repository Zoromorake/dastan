import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { getEditorTheme } from '../utils/editor-theme';
import { countWordsFromContent } from '../utils/screenplay-text';
import type { JSONContent } from '@tiptap/core';
import {
	endWritingSprint,
	getSprintRemainingMinutes,
	loadWritingStats,
	setSessionGoals,
	startWritingSprint,
	type WritingStatsState,
} from '../utils/writing-stats';

const SPRINT_PRESETS = [15, 25, 45] as const;

interface WritingSprintChipProps {
	isDark: boolean;
	documentContent: JSONContent | null;
}

function refreshStats(): WritingStatsState {
	return loadWritingStats();
}

export function WritingSprintChip({ isDark, documentContent }: WritingSprintChipProps) {
	const theme = getEditorTheme(isDark);
	const [open, setOpen] = useState(false);
	const [stats, setStats] = useState<WritingStatsState>(() => refreshStats());
	const wordCount = countWordsFromContent(documentContent);
	const sprintActive = Boolean(stats.sprintEndsAt);
	const remainingMinutes = getSprintRemainingMinutes(stats);
	const sprintWords = Math.max(0, stats.todayWords - stats.sprintStartWords);
	const sessionPages = Number((sprintWords / 250).toFixed(1));

	useEffect(() => {
		const sync = () => setStats(refreshStats());
		sync();
		const interval = window.setInterval(sync, 15_000);
		return () => window.clearInterval(interval);
	}, []);

	useEffect(() => {
		if (!stats.sprintEndsAt) {
			return;
		}

		if (new Date(stats.sprintEndsAt).getTime() <= Date.now()) {
			setStats(endWritingSprint(wordCount));
		}
	}, [stats.sprintEndsAt, wordCount]);

	const shellClass = cn(
		'inline-flex shrink-0 min-w-[7rem] flex-col rounded-lg border px-2.5 py-1.5 text-left transition hover:opacity-90',
		isDark ? 'border-slate-600 bg-slate-800/70 text-slate-100' : 'border-stone-300 bg-stone-50 text-stone-900',
	);

	return (
		<>
			<button className={shellClass} type="button" title="Writing sprint" onClick={() => setOpen(true)}>
				<div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums">
					<Timer size={12} />
					{sprintActive ? `${remainingMinutes}m left` : 'Sprint'}
				</div>
				<span className={cn('mt-1 text-[10px] uppercase tracking-[0.08em]', theme.statusText)}>
					{sprintActive ? `${sprintWords} words` : 'Focus timer'}
				</span>
			</button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className={cn('max-w-sm border', theme.surface)}>
					<DialogHeader>
						<DialogTitle>Writing sprint</DialogTitle>
						<DialogDescription className={theme.statusText}>
							Quiet focus timer with a words-and-pages summary at the end.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4">
						{stats.lastSessionSummary ? (
							<p className={cn('rounded-lg border px-3 py-2 text-sm', theme.statusPill)}>
								Last sprint: {stats.lastSessionSummary}
							</p>
						) : null}

						<div className="flex flex-wrap gap-2">
							{SPRINT_PRESETS.map((minutes) => (
								<Button
									key={minutes}
									type="button"
									variant="outline"
									onClick={() => setStats(startWritingSprint(minutes))}
								>
									{minutes} min
								</Button>
							))}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<label className="grid gap-1 text-sm">
								<span>Session word goal</span>
								<input
									className="rounded-md border px-2 py-1"
									min={50}
									type="number"
									value={stats.sessionWordGoal}
									onChange={(event) => {
										setStats(setSessionGoals(Number(event.target.value) || 250, stats.sessionPageGoal));
									}}
								/>
							</label>
							<label className="grid gap-1 text-sm">
								<span>Page goal</span>
								<input
									className="rounded-md border px-2 py-1"
									min={0.25}
									step={0.25}
									type="number"
									value={stats.sessionPageGoal}
									onChange={(event) => {
										setStats(setSessionGoals(stats.sessionWordGoal, Number(event.target.value) || 1));
									}}
								/>
							</label>
						</div>

						{sprintActive ? (
							<p className={cn('text-sm', theme.statusText)}>
								{sprintWords} / {stats.sessionWordGoal} words · ~{sessionPages} / {stats.sessionPageGoal} pages
							</p>
						) : null}

						<div className="flex justify-end gap-2">
							{sprintActive ? (
								<Button type="button" variant="outline" onClick={() => setStats(endWritingSprint(wordCount))}>
									End sprint
								</Button>
							) : null}
							<Button type="button" onClick={() => setOpen(false)}>
								Done
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
