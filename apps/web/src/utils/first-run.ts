const HAS_SEEN_TOUR_KEY = 'dastan.has-seen-tour';
const FIRST_RUN_SEEDED_KEY = 'dastan.first-run-seeded';

export function loadHasSeenTour(): boolean {
	if (typeof window === 'undefined') {
		return true;
	}

	return window.localStorage.getItem(HAS_SEEN_TOUR_KEY) === '1';
}

export function setHasSeenTour(value: boolean): void {
	window.localStorage.setItem(HAS_SEEN_TOUR_KEY, value ? '1' : '0');
}

export function loadFirstRunSeeded(): boolean {
	if (typeof window === 'undefined') {
		return true;
	}

	return window.localStorage.getItem(FIRST_RUN_SEEDED_KEY) === '1';
}

export function setFirstRunSeeded(value: boolean): void {
	window.localStorage.setItem(FIRST_RUN_SEEDED_KEY, value ? '1' : '0');
}
