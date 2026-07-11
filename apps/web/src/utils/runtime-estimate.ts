/** Industry rule of thumb: one screenplay page ≈ one minute of screen time. */
export function estimateRuntimeMinutes(pageCount: number): number {
	return Math.max(1, pageCount);
}

export function formatPageCount(pageCount: number): string {
	const count = Math.max(0, Math.round(pageCount));

	if (count === 1) {
		return '1 page';
	}

	return `${count} pages`;
}

export function formatRuntimeEstimate(pageCount: number): string {
	const minutes = estimateRuntimeMinutes(pageCount);

	if (minutes === 1) {
		return '~1 min';
	}

	return `~${minutes} min`;
}

export function formatPageAndRuntime(pageCount: number): string {
	return `${formatPageCount(pageCount)} · ${formatRuntimeEstimate(pageCount)}`;
}
