import { Khatam } from '@/components/ui/khatam';

export function HubSectionDivider() {
	return (
		<div aria-hidden="true" className="flex items-center gap-3 py-1">
			<span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/35 to-transparent" />
			<Khatam size="0.9rem" opacity={0.85} innerOpacity={0.85} />
			<span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/35 to-transparent" />
		</div>
	);
}
