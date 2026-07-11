import { useEffect, useMemo, useState } from 'react';
import type { ScreenplayDocumentRecord } from '../../types';
import { formatPageCount, formatRuntimeEstimate } from '../../utils/runtime-estimate';
import { countPagesFromContent } from '../../utils/screenplay-pagination';
import { getHubTheme } from '../../utils/hub-theme';
import { loadWritingStats } from '../../utils/writing-stats';
import { getDocumentSessionStats } from '../../utils/document-session-stats';
import { buildTodayBriefing } from '../../utils/today-briefing';
import { hasRealScriptContent } from '../../utils/is-blank-draft';
import { loadAiTodayPanel, loadTrackWritingStats } from '../../utils/user-settings';
import { fetchTodayAiLine } from '../../utils/today-briefing-ai';
import { cn } from '@/lib/utils';

interface HubTodayPanelProps {
	documents: ScreenplayDocumentRecord[];
	authorName: string;
	isDark: boolean;
	onOpenDocument: (id: string, options?: { blockIndex?: number }) => void;
}

function PosterMini({ title, authorName }: { title: string; authorName: string }) {
	return (
		<div
			className="relative flex aspect-[2/3] w-16 shrink-0 flex-col overflow-hidden rounded-lg border border-black/5 bg-paper-bright px-2 py-3 text-slate-900 shadow-inner sm:w-20"
			style={{
				backgroundImage:
					'linear-gradient(145deg, rgba(255,255,255,0.35), transparent 55%), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.015) 3px)',
			}}
		>
			<div className="flex flex-1 flex-col items-center justify-start pt-[20%] text-center">
				<p className="line-clamp-3 font-[family-name:var(--font-screenplay)] text-[8px] leading-tight font-bold tracking-wide uppercase">
					{title}
				</p>
				<p className="mt-2 font-[family-name:var(--font-screenplay)] text-[6px] tracking-[0.1em] text-slate-600 uppercase">
					by {authorName}
				</p>
			</div>
		</div>
	);
}

export function HubTodayPanel({ documents, authorName, isDark, onOpenDocument }: HubTodayPanelProps) {
	const hub = getHubTheme(isDark);
	const realDocuments = useMemo(() => documents.filter((document) => hasRealScriptContent(document)), [documents]);
	const latest = useMemo(
		() => [...realDocuments].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null,
		[realDocuments],
	);
	const [aiLine, setAiLine] = useState<string | null>(null);

	const briefing = useMemo(() => {
		if (!latest) {
			return null;
		}

		return buildTodayBriefing({
			document: latest,
			sessionStats: getDocumentSessionStats(latest.id),
			writingStats: loadWritingStats(),
		});
	}, [latest]);

	useEffect(() => {
		if (!latest || !loadAiTodayPanel()) {
			setAiLine(null);
			return;
		}

		const nextBeat = latest.workspace?.development?.structureBeats?.find((beat) => beat.summary.trim().length === 0);

		let active = true;

		void fetchTodayAiLine({
			document: latest,
			sceneHeading: briefing?.activeSceneHeading ?? null,
			nextBeatLabel: nextBeat?.label ?? null,
		}).then((line) => {
			if (active) {
				setAiLine(line);
			}
		});

		return () => {
			active = false;
		};
	}, [briefing?.activeSceneHeading, latest]);

	if (!latest || !briefing) {
		return null;
	}

	const title = latest.title || 'Untitled';
	const pageCount = countPagesFromContent(latest.content);
	const writingStats = loadWritingStats();
	const sessionStats = getDocumentSessionStats(latest.id);
	const showSessionStats = loadTrackWritingStats() && sessionStats && sessionStats.wordsAdded > 0;

	return (
		<section className={cn('rounded-2xl border px-4 py-4 sm:px-5', hub.card)}>
			<p className="text-[10px] font-semibold tracking-[0.16em] text-gold uppercase">Today</p>

			<div className="mt-3 flex flex-wrap items-start gap-4">
				<PosterMini authorName={authorName} title={title} />

				<div className="min-w-0 flex-1">
					<h2 className={cn('truncate text-base font-semibold', hub.panelTitle)}>{title}</h2>

					{briefing.activeSceneHeading ? (
						<p className={cn('mt-1 font-[family-name:var(--font-screenplay)] text-xs uppercase tracking-wide', hub.panelMuted)}>
							{briefing.activeSceneHeading}
						</p>
					) : null}

					<div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
						<span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">{formatPageCount(pageCount)}</span>
						<span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">{formatRuntimeEstimate(pageCount)}</span>
						{showSessionStats ? (
							<span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">
								+{sessionStats.wordsAdded} words this session
							</span>
						) : null}
						{writingStats.streakDays > 0 ? (
							<span className="rounded-full bg-gold/10 px-2 py-0.5 text-gold">
								{writingStats.streakDays}-day streak
							</span>
						) : null}
						{writingStats.sprintEndsAt ? (
							<span className="rounded-full bg-gold/10 px-2 py-0.5 text-gold">Sprint active</span>
						) : null}
					</div>

					{briefing.lines.length > 0 ? (
						<ul className={cn('mt-3 space-y-1 text-sm', hub.panelMuted)}>
							{briefing.lines.map((line) => (
								<li key={line}>{line}</li>
							))}
						</ul>
					) : null}

					{aiLine ? <p className="mt-2 text-sm italic text-muted-foreground">{aiLine}</p> : null}
				</div>

				<button
					className={cn('shrink-0 rounded-lg px-4 py-2 text-sm font-medium', hub.accentButton)}
					type="button"
					onClick={() => {
						onOpenDocument(latest.id, { blockIndex: latest.lastCursorBlockIndex });
					}}
				>
					Continue writing
				</button>
			</div>
		</section>
	);
}
