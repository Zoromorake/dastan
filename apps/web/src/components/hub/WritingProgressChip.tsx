import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getSettingsTheme } from '../../utils/hub-theme';
import {
	getSessionMinutes,
	loadWritingStats,
	setDailyWordGoal,
	type WritingStatsState,
} from '../../utils/writing-stats';
import { loadTrackWritingStats, setTrackWritingStats } from '../../utils/user-settings';

interface WritingProgressChipProps {
	isDark: boolean;
}

function refreshStats(): WritingStatsState {
	return loadWritingStats();
}

export function WritingProgressChip({ isDark }: WritingProgressChipProps) {
	const ui = getSettingsTheme(isDark);
	const [open, setOpen] = useState(false);
	const [trackingEnabled, setTrackingEnabled] = useState(() => loadTrackWritingStats());
	const [stats, setStats] = useState<WritingStatsState>(() => refreshStats());
	const [goalInput, setGoalInput] = useState(() => String(refreshStats().dailyWordGoal));

	const progress = Math.min(100, Math.round((stats.todayWords / Math.max(stats.dailyWordGoal, 1)) * 100));

	useEffect(() => {
		const sync = () => {
			setStats(refreshStats());
			setTrackingEnabled(loadTrackWritingStats());
		};

		sync();
		window.addEventListener('focus', sync);
		const interval = window.setInterval(sync, 30_000);

		return () => {
			window.removeEventListener('focus', sync);
			window.clearInterval(interval);
		};
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}

		const nextStats = refreshStats();
		setStats(nextStats);
		setGoalInput(String(nextStats.dailyWordGoal));
		setTrackingEnabled(loadTrackWritingStats());
	}, [open]);

	if (!trackingEnabled) {
		return (
			<button
				className={cn(
					'inline-flex shrink-0 min-w-[7.5rem] flex-col rounded-lg border px-2.5 py-1.5 text-left transition hover:opacity-90',
					isDark ? 'border-slate-600 bg-slate-800/70' : 'border-stone-300 bg-stone-50',
				)}
				type="button"
				onClick={() => setOpen(true)}
			>
				<span className={cn('text-lg font-semibold tabular-nums leading-none', ui.title)}>—</span>
				<span className={cn('mt-1.5 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.08em]', ui.muted)}>
					Track progress
				</span>
			</button>
		);
	}

	return (
		<>
			<button
				className={cn(
					'inline-flex shrink-0 min-w-[7.5rem] flex-col rounded-lg border px-2.5 py-1.5 text-left transition hover:opacity-90',
					isDark ? 'border-slate-600 bg-slate-800/70 text-slate-100' : 'border-stone-300 bg-stone-50 text-stone-900',
				)}
				type="button"
				title="Goal of the day"
				onClick={() => setOpen(true)}
			>
				<div className="flex min-w-0 items-baseline justify-between gap-1.5">
					<span className="min-w-0 truncate text-base font-semibold tabular-nums leading-none">
						{stats.todayWords}
						<span className={cn('text-xs font-normal', ui.muted)}> / {stats.dailyWordGoal}</span>
					</span>
					{stats.streakDays > 0 ? (
						<span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
							<Flame size={12} />
							{stats.streakDays}
						</span>
					) : null}
				</div>
				<span className={cn('mt-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.08em]', ui.muted)}>
					Daily goal
				</span>
				<div
					aria-hidden
					className={cn('mt-1.5 h-1 overflow-hidden rounded-full', isDark ? 'bg-slate-700' : 'bg-stone-200')}
				>
					<div
						className="h-full rounded-full bg-amber-500 transition-all"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className={cn('max-w-sm border', ui.shell)}>
					<DialogHeader>
						<DialogTitle className={ui.title}>Writing progress</DialogTitle>
						<DialogDescription className={ui.muted}>
							Local streaks and daily goals while you draft.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4">
						<div className={cn('rounded-xl border p-4', ui.surface)}>
							<p className={cn('text-xs uppercase tracking-[0.16em]', ui.muted)}>Today</p>
							<p className={cn('mt-1 text-2xl font-semibold tabular-nums', ui.title)}>
								{stats.todayWords}
								<span className={cn('ml-2 text-sm font-normal', ui.muted)}>/ {stats.dailyWordGoal}</span>
							</p>
							<p className={cn('mt-2 text-sm', ui.muted)}>
								{stats.streakDays} day streak · {getSessionMinutes(stats)} min this session
							</p>
						</div>

						<label className="grid gap-2">
							<span className={cn('text-sm font-medium', ui.label)}>Daily word goal</span>
							<Input
								className={ui.field}
								min={50}
								type="number"
								value={goalInput}
								onChange={(event) => {
									setGoalInput(event.target.value);
									const next = setDailyWordGoal(Number(event.target.value) || 500);
									setStats(next);
								}}
							/>
						</label>

						<label
							className={cn(
								'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5',
								isDark ? 'border-slate-700 bg-slate-800/40' : 'border-stone-200 bg-stone-50/80',
							)}
						>
							<span className={cn('text-sm', ui.label)}>Track writing stats</span>
							<input
								checked={trackingEnabled}
								className="size-4 rounded accent-amber-600"
								type="checkbox"
								onChange={(event) => {
									setTrackWritingStats(event.target.checked);
									setTrackingEnabled(event.target.checked);
								}}
							/>
						</label>

						<Button type="button" onClick={() => setOpen(false)}>
							Done
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
