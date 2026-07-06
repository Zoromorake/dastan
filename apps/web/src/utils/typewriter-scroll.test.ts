import { describe, expect, it } from 'vitest';
import { scrollCaretIntoTypewriterBand } from './typewriter-scroll';

describe('typewriter-scroll', () => {
	it('does not scroll when caret is inside the center band', () => {
		const container = document.createElement('div');
		Object.defineProperty(container, 'clientHeight', { value: 400 });
		container.scrollTop = 0;

		const caretNode = document.createElement('p');
		caretNode.getBoundingClientRect = () =>
			({
				top: 180,
				height: 20,
				bottom: 200,
				left: 0,
				right: 0,
				width: 0,
				x: 0,
				y: 180,
				toJSON: () => ({}),
			}) as DOMRect;

		container.getBoundingClientRect = () =>
			({
				top: 0,
				height: 400,
				bottom: 400,
				left: 0,
				right: 0,
				width: 0,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			}) as DOMRect;

		const scrolled = scrollCaretIntoTypewriterBand({
			container,
			caretNode,
			centerBandRatio: 0.15,
			prefersReducedMotion: true,
		});
		expect(scrolled).toBe(false);
		expect(container.scrollTop).toBe(0);
	});
});
