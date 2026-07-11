import { cn } from '@/lib/utils';

interface EtymologyLineProps {
	className?: string;
}

export function EtymologyLine({ className }: EtymologyLineProps) {
	return (
		<p className={cn('flex flex-wrap items-baseline gap-1.5 text-sm text-muted-foreground', className)}>
			<span>dastan</span>
			<span aria-hidden="true" className="opacity-45">
				·
			</span>
			<span className="font-[family-name:var(--font-persian)]" dir="rtl" lang="fa">
				داستان
			</span>
			<span aria-hidden="true" className="opacity-45">
				·
			</span>
			<span>Persian, an epic tale</span>
		</p>
	);
}
