import { HubEmptyMark } from './hub/HubEmptyMark';
import { Button } from '@/components/ui/button';
import { formatPageCount, formatRuntimeEstimate } from '../utils/runtime-estimate';
import { cn } from '@/lib/utils';

interface FadeOutCelebrationProps {
	open: boolean;
	title: string;
	pageCount: number;
	draftLabel: string;
	reducedMotion: boolean;
	onDismiss: () => void;
	onSaveCheckpoint: () => void;
}

export function FadeOutCelebration({
	open,
	title,
	pageCount,
	draftLabel,
	reducedMotion,
	onDismiss,
	onSaveCheckpoint,
}: FadeOutCelebrationProps) {
	if (!open) {
		return null;
	}

	return (
		<div className="pointer-events-none fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center">
			<div
				className={cn(
					'pointer-events-auto w-full max-w-md rounded-2xl border border-gold/25 bg-paper-bright p-6 text-slate-900 shadow-2xl',
					reducedMotion ? 'opacity-100' : 'animate-in fade-in duration-500',
				)}
			>
				<HubEmptyMark className="mb-3" />
				<p className="font-[family-name:var(--font-screenplay)] text-xs tracking-[0.14em] text-slate-600 uppercase">
					That&apos;s a wrap
				</p>
				<h2 className="mt-2 text-lg font-semibold text-slate-900">{title}</h2>
				<p className="mt-1 text-sm text-slate-700">
					{formatPageCount(pageCount)} · {formatRuntimeEstimate(pageCount)} · {draftLabel}
				</p>
				<div className="mt-5 flex flex-wrap gap-2">
					<Button size="sm" type="button" variant="outline" onClick={onSaveCheckpoint}>
						Save a checkpoint
					</Button>
					<Button size="sm" type="button" onClick={onDismiss}>
						Continue
					</Button>
				</div>
			</div>
		</div>
	);
}
