import { Khatam } from '@/components/ui/khatam';

interface HubEmptyMarkProps {
	className?: string;
}

export function HubEmptyMark({ className }: HubEmptyMarkProps) {
	return (
		<div className={className}>
			<Khatam className="mx-auto" size="1.75rem" opacity={0.55} innerOpacity={0.45} />
		</div>
	);
}
