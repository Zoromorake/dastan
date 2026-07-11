import { Button } from '@/components/ui/button';
import { getHubTheme } from '../../utils/hub-theme';

interface HubBackupNudgeProps {
	isDark: boolean;
	onDismiss: () => void;
}

export function HubBackupNudge({ isDark, onDismiss }: HubBackupNudgeProps) {
	const hub = getHubTheme(isDark);

	return (
		<div
			className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${hub.card}`}
			role="status"
		>
			<p className={hub.panelMuted}>
				Scripts live only on this device. Export a Fountain or PDF backup when you can.
			</p>
			<div className="flex items-center gap-2">
				<Button size="sm" type="button" variant="ghost" onClick={onDismiss}>
					Not now
				</Button>
			</div>
		</div>
	);
}
