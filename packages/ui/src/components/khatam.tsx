import { cn } from '../lib/utils';
import { KHATAM_PATHS, KHATAM_VIEWBOX } from '../lib/khatam';

interface KhatamProps {
	className?: string;
	size?: string | number;
	opacity?: number;
	innerOpacity?: number;
}

export function Khatam({ className, size = '1.1rem', opacity = 1, innerOpacity = 1 }: KhatamProps) {
	const dimension = typeof size === 'number' ? `${size}px` : size;

	return (
		<svg
			className={cn('shrink-0 text-gold', className)}
			viewBox={KHATAM_VIEWBOX}
			fill="none"
			aria-hidden="true"
			style={{ width: dimension, height: dimension, opacity }}
		>
			<path d={KHATAM_PATHS[0]} stroke="currentColor" strokeWidth="0.55" />
			<path d={KHATAM_PATHS[1]} stroke="currentColor" strokeWidth="0.4" opacity={innerOpacity} />
		</svg>
	);
}
