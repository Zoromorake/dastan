export interface TypewriterScrollOptions {
	container: HTMLElement;
	caretNode: Element;
	centerBandRatio?: number;
	prefersReducedMotion?: boolean;
}

function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return false;
	}

	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scroll so the caret line stays near vertical center, but only when it drifts outside a center band.
 */
export function scrollCaretIntoTypewriterBand({
	container,
	caretNode,
	centerBandRatio = 0.15,
	prefersReducedMotion: reducedMotion = prefersReducedMotion(),
}: TypewriterScrollOptions): boolean {
	const containerRect = container.getBoundingClientRect();
	const nodeRect = caretNode.getBoundingClientRect();
	const caretCenter = nodeRect.top + nodeRect.height / 2;
	const viewportCenter = containerRect.top + containerRect.height / 2;
	const band = containerRect.height * centerBandRatio;

	if (Math.abs(caretCenter - viewportCenter) <= band) {
		return false;
	}

	const nodeRelativeTop = nodeRect.top - containerRect.top + container.scrollTop;
	const targetScrollTop = nodeRelativeTop - container.clientHeight / 2 + nodeRect.height / 2;

	if (Math.abs(container.scrollTop - targetScrollTop) < 1) {
		return false;
	}

	container.scrollTo({
		top: targetScrollTop,
		behavior: reducedMotion ? 'auto' : 'smooth',
	});

	return true;
}
