import { describe, expect, it } from 'vitest';
import { findTextMatches } from './find-replace';

function makeTextDoc(segments: Array<{ text: string; pos: number }>) {
	return {
		descendants(callback: (node: { isText: boolean; text?: string }, pos: number) => void) {
			for (const segment of segments) {
				callback({ isText: true, text: segment.text }, segment.pos);
			}
		},
	};
}

describe('findTextMatches', () => {
	it('returns empty results for blank queries', () => {
		const doc = makeTextDoc([{ text: 'Hello world', pos: 1 }]);
		expect(findTextMatches(doc as never, '')).toEqual([]);
		expect(findTextMatches(doc as never, '   ')).toEqual([]);
	});

	it('finds all case-insensitive matches across text nodes', () => {
		const doc = makeTextDoc([
			{ text: 'INT. HOUSE - DAY', pos: 1 },
			{ text: 'She enters the house.', pos: 20 },
		]);

		expect(findTextMatches(doc as never, 'house')).toEqual([
			{ from: 6, to: 11 },
			{ from: 35, to: 40 },
		]);
	});

	it('respects case sensitivity', () => {
		const doc = makeTextDoc([{ text: 'House house', pos: 1 }]);

		expect(findTextMatches(doc as never, 'House', true)).toEqual([{ from: 1, to: 6 }]);
		expect(findTextMatches(doc as never, 'house', true)).toEqual([{ from: 7, to: 12 }]);
	});
});
