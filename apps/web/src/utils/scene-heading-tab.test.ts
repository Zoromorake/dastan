import { describe, expect, it } from 'vitest';
import {
	advanceSceneHeadingOnTab,
	canonicalizeSceneHeadingIntro,
	hasStartedSceneHeading,
	isSceneHeadingReadyForAction,
} from './scene-heading-tab';

describe('scene heading tab flow', () => {
	it('starts with INT. on an empty slugline', () => {
		expect(advanceSceneHeadingOnTab('')).toEqual({ kind: 'replace', text: 'INT. ', cursor: 5 });
	});

	it('completes a partial intro', () => {
		expect(advanceSceneHeadingOnTab('INT')).toEqual({ kind: 'replace', text: 'INT. ', cursor: 5 });
	});

	it('adds the time separator after the location', () => {
		expect(advanceSceneHeadingOnTab('INT. OFFICE')).toEqual({
			kind: 'replace',
			text: 'INT. OFFICE - ',
			cursor: 14,
		});
	});

	it('moves to action once time is present', () => {
		expect(advanceSceneHeadingOnTab('INT. OFFICE - DAY')).toEqual({ kind: 'action' });
		expect(isSceneHeadingReadyForAction('INT. OFFICE - DAY')).toBe(true);
	});

	it('canonicalizes action-line shortcuts', () => {
		expect(canonicalizeSceneHeadingIntro('ext')).toBe('EXT. ');
	});

	it('knows when a slugline has not been started yet', () => {
		expect(hasStartedSceneHeading('')).toBe(false);
		expect(hasStartedSceneHeading('INT')).toBe(true);
		expect(hasStartedSceneHeading('hello')).toBe(false);
	});
});
