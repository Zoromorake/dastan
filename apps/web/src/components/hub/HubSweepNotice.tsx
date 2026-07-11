import { Button } from '@/components/ui/button';
import { getHubTheme } from '../../utils/hub-theme';

interface HubSweepNoticeProps {
	count: number;
	isDark: boolean;
	onDismiss: () => void;
	onUndo: () => void;
}

export function HubSweepNotice({ count, isDark, onDismiss, onUndo }: HubSweepNoticeProps) {
	const hub = getHubTheme(isDark);

	if (count <= 0) {
		return null;
	}

	return (
		<div
			className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${hub.card}`}
			role="status"
		>
			<p className={hub.panelMuted}>
				Tidied {count} untouched blank script{count === 1 ? '' : 's'} — in Trash for 30 days.
			</p>
			<div className="flex items-center gap-2">
				<Button size="sm" type="button" variant="outline" onClick={onUndo}>
					Undo
				</Button>
				<Button size="sm" type="button" variant="ghost" onClick={onDismiss}>
					Dismiss
				</Button>
			</div>
		</div>
	);
}
