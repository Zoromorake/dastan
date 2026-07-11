/** Eight-pointed star (khatam) — single geometric motif, thin stroke. */
export const KHATAM_VIEWBOX = '0 0 24 24';

export const KHATAM_PATHS = [
	'M12 1.5 14.1 9.4 22 11.5 14.1 13.6 12 21.5 9.9 13.6 2 11.5 9.9 9.4 12 1.5Z',
	'M12 6.8 13.2 10.2 16.6 11.5 13.2 12.8 12 16.2 10.8 12.8 7.4 11.5 10.8 10.2 12 6.8Z',
] as const;

export function khatamSvgMarkup(options?: {
	opacity?: number;
	className?: string;
	color?: string;
}): string {
	const opacity = options?.opacity ?? 1;
	const stroke = options?.color ?? 'currentColor';
	const classAttr = options?.className ? ` class="${options.className}"` : '';

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${KHATAM_VIEWBOX}" fill="none" aria-hidden="true"${classAttr}><path d="${KHATAM_PATHS[0]}" stroke="${stroke}" stroke-width="0.55"/><path d="${KHATAM_PATHS[1]}" stroke="${stroke}" stroke-width="0.4" opacity="${opacity}"/></svg>`;
}
