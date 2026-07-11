import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEditorTheme } from '../../utils/editor-theme';
import {
	getToolHumanTitle,
	type ToolPreviewState,
	type ToolPreviewStatus,
} from '../../utils/ai-tool-preview';

interface AiToolCallCardProps {
	preview: ToolPreviewState;
	isDark: boolean;
	onAccept?: () => void;
	onReject?: () => void;
	onOpenHistory?: () => void;
}

const STATUS_LABELS: Record<ToolPreviewStatus, string> = {
	running: 'Preparing…',
	preview: 'Preview ready',
	accepted: 'Accepted',
	rejected: 'Rejected',
	failed: 'Failed',
	skipped: 'Skipped',
};

export function AiToolCallCard({
	preview,
	isDark,
	onAccept,
	onReject,
	onOpenHistory,
}: AiToolCallCardProps) {
	const [expanded, setExpanded] = useState(preview.status === 'preview' || preview.status === 'running');
	const theme = getEditorTheme(isDark);
	const title = getToolHumanTitle(preview.toolName, preview.input);

	return (
		<div className={cn('rounded-lg border text-xs', theme.statusPill)}>
			<button
				className="flex w-full items-center gap-2 px-3 py-2 text-left"
				type="button"
				onClick={() => setExpanded((e) => !e)}
			>
				{preview.status === 'running' ? (
					<Loader2 className="size-3.5 shrink-0 animate-spin text-gold" />
				) : expanded ? (
					<ChevronDown className="size-3.5 shrink-0 opacity-60" />
				) : (
					<ChevronRight className="size-3.5 shrink-0 opacity-60" />
				)}
				<span className="min-w-0 flex-1 truncate font-medium">{title}</span>
				<span className={cn('shrink-0 text-[10px] uppercase tracking-[0.1em]', theme.statusText)}>
					{STATUS_LABELS[preview.status]}
				</span>
			</button>

			{expanded ? (
				<div className="border-t px-3 py-2">
					<pre className="max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
						{preview.summary}
					</pre>
					{preview.status === 'preview' && onAccept && onReject ? (
						<div className="mt-2 flex gap-2">
							<button
								className={cn('rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.1em]', theme.accentPill)}
								type="button"
								onClick={onAccept}
							>
								Accept
							</button>
							<button
								className={cn('rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.1em]', theme.statusPill)}
								type="button"
								onClick={onReject}
							>
								Reject
							</button>
						</div>
					) : null}
					{preview.status === 'accepted' && onOpenHistory ? (
						<button
							className={`mt-2 text-[10px] underline-offset-2 hover:underline ${theme.statusText}`}
							type="button"
							onClick={onOpenHistory}
						>
							Undo via History
						</button>
					) : null}
				</div>
			) : null}
		</div>
	);
}
