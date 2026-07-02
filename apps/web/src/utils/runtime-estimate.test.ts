import { describe, expect, it } from 'vitest';
import { formatPageAndRuntime, formatRuntimeEstimate, estimateRuntimeMinutes } from './runtime-estimate';

describe('runtime-estimate', () => {
	it('uses one minute per page', () => {
		expect(estimateRuntimeMinutes(90)).toBe(90);
		expect(formatRuntimeEstimate(90)).toBe('~90 min');
		expect(formatPageAndRuntime(12)).toBe('12 pg · ~12 min');
	});

	it('never returns less than one minute', () => {
		expect(estimateRuntimeMinutes(0)).toBe(1);
		expect(formatRuntimeEstimate(1)).toBe('~1 min');
	});
});
