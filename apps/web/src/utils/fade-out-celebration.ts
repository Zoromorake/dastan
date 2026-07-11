import type { JSONContent } from '@tiptap/core';
import { getScreenplayBlocksFromContent } from './screenplay-text';

const CELEBRATION_PREFIX = 'dastan.fade-out-celebration.';

function celebrationKey(documentId: string): string {
	return `${CELEBRATION_PREFIX}${documentId}.${new Date().toISOString().slice(0, 10)}`;
}

export function hasShownFadeOutCelebrationToday(documentId: string): boolean {
	return window.localStorage.getItem(celebrationKey(documentId)) === '1';
}

export function markFadeOutCelebrationShown(documentId: string): void {
	window.localStorage.setItem(celebrationKey(documentId), '1');
}

const ENDING_PATTERNS = [/^FADE OUT\.?$/iu, /^THE END\.?$/iu];

export function detectFadeOutEnding(content: JSONContent | null): boolean {
	if (!content?.content || content.content.length === 0) {
		return false;
	}

	const blocks = getScreenplayBlocksFromContent(content);
	const tail = blocks.slice(-3);

	return tail.some((block) => {
		if (block.type !== 'transition' && block.type !== 'centered') {
			return false;
		}

		const normalized = block.text.trim();
		return ENDING_PATTERNS.some((pattern) => pattern.test(normalized));
	});
}
