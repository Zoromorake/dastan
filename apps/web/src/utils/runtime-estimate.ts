/** Industry rule of thumb: one screenplay page ≈ one minute of screen time. */
export function estimateRuntimeMinutes(pageCount: number): number {
	return Math.max(1, pageCount);
}

export function formatRuntimeEstimate(pageCount: number): string {
	const minutes = estimateRuntimeMinutes(pageCount);

	if (minutes === 1) {
		return '~1 min';
	}

	return `~${minutes} min`;
}

export function formatPageAndRuntime(pageCount: number): string {
	return `${pageCount} pg · ${formatRuntimeEstimate(pageCount)}`;
}
