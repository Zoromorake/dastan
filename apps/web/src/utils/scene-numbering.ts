import type { JSONContent } from '@tiptap/core';
import { getSceneHeadingsFromContent } from '@dastan/fountain-parser';

/** Scene-index-keyed locked numbers (0-based scene index → display label). */
export type SceneNumberLocks = Record<number, string>;

interface ParsedSceneLabel {
	letter: string | null;
	base: number | null;
}

export function lockSceneNumbers(content: JSONContent | null): SceneNumberLocks {
	const headings = getSceneHeadingsFromContent(content);
	const locks: SceneNumberLocks = {};

	headings.forEach((heading, sceneIndex) => {
		locks[sceneIndex] = String(sceneIndex + 1);
	});

	return locks;
}

export function computeSceneNumberLabels(
	content: JSONContent | null,
	locks: SceneNumberLocks = {},
): Map<number, string> {
	const headings = getSceneHeadingsFromContent(content);
	const labels = new Map<number, string>();
	const hasLocks = Object.keys(locks).length > 0;
	let autoCounter = 0;

	headings.forEach((heading, sceneIndex) => {
		if (hasLocks && locks[sceneIndex]) {
			labels.set(heading.index, locks[sceneIndex]);
			return;
		}

		autoCounter += 1;
		labels.set(heading.index, String(autoCounter));
	});

	return labels;
}

function parseSceneLabel(label: string): ParsedSceneLabel {
	const match = label.trim().match(/^([A-Z])(\d+)$/u);

	if (match) {
		return { letter: match[1], base: Number(match[2]) };
	}

	const numeric = label.trim().match(/^(\d+)$/u);

	if (numeric) {
		return { letter: null, base: Number(numeric[1]) };
	}

	return { letter: null, base: null };
}

function maxBaseNumber(locks: SceneNumberLocks): number {
	let max = 0;

	for (const value of Object.values(locks)) {
		const { base } = parseSceneLabel(value);

		if (base !== null && base > max) {
			max = base;
		}
	}

	return max;
}

function collectPrefixLetters(locks: SceneNumberLocks, base: number): string[] {
	const letters: string[] = [];

	for (const value of Object.values(locks)) {
		const parsed = parseSceneLabel(value);

		if (parsed.base === base && parsed.letter) {
			letters.push(parsed.letter);
		}
	}

	return letters;
}

function nextPrefixLetter(locks: SceneNumberLocks, base: number): string {
	const letters = collectPrefixLetters(locks, base);

	if (letters.length === 0) {
		return 'A';
	}

	const maxCode = Math.max(...letters.map((letter) => letter.charCodeAt(0)));
	return String.fromCharCode(maxCode + 1);
}

function followingBaseNumber(followingLabel: string | undefined): number | null {
	if (!followingLabel) {
		return null;
	}

	const parsed = parseSceneLabel(followingLabel);
	return parsed.base;
}

function assignInsertedSceneLabel(
	workingLocks: SceneNumberLocks,
	insertSceneIndex: number,
	followingLabel: string | undefined,
): string {
	const followingBase = followingBaseNumber(followingLabel);

	if (followingBase === null) {
		return String(maxBaseNumber(workingLocks) + 1);
	}

	return `${nextPrefixLetter(workingLocks, followingBase)}${followingBase}`;
}

/** Walk aligned scene lists and return 0-based scene indices of newly inserted headings. */
export function findInsertedSceneIndices(
	previousContent: JSONContent | null,
	nextContent: JSONContent | null,
): number[] {
	const previousHeadings = getSceneHeadingsFromContent(previousContent);
	const nextHeadings = getSceneHeadingsFromContent(nextContent);
	const inserts: number[] = [];
	let previousIndex = 0;

	for (let nextIndex = 0; nextIndex < nextHeadings.length; nextIndex += 1) {
		const previousHeading = previousHeadings[previousIndex];
		const nextHeading = nextHeadings[nextIndex];

		if (previousHeading && previousHeading.text.trim() === nextHeading.text.trim()) {
			previousIndex += 1;
			continue;
		}

		inserts.push(nextIndex);
	}

	return inserts;
}

/**
 * Reconcile locked scene numbers after insertions, deletions, or multi-scene paste.
 * Final Draft convention: inserted scenes take a letter prefix on the following scene's number (A13, B13, …).
 */
export function applySceneInsertNumbering(
	previousContent: JSONContent | null,
	nextContent: JSONContent | null,
	locks: SceneNumberLocks,
): SceneNumberLocks {
	if (!nextContent || Object.keys(locks).length === 0) {
		return locks;
	}

	const previousHeadings = getSceneHeadingsFromContent(previousContent);
	const nextHeadings = getSceneHeadingsFromContent(nextContent);

	if (nextHeadings.length === previousHeadings.length) {
		const unchanged = nextHeadings.every(
			(heading, index) => heading.text.trim() === previousHeadings[index]?.text.trim(),
		);

		if (unchanged) {
			return locks;
		}
	}

	const newLocks: SceneNumberLocks = {};
	const workingLocks: SceneNumberLocks = { ...locks };
	let previousIndex = 0;

	for (let nextSceneIndex = 0; nextSceneIndex < nextHeadings.length; nextSceneIndex += 1) {
		const nextHeading = nextHeadings[nextSceneIndex];

		while (
			previousIndex < previousHeadings.length &&
			previousHeadings[previousIndex].text.trim() !== nextHeading.text.trim() &&
			previousIndex + 1 < previousHeadings.length &&
			previousHeadings[previousIndex + 1].text.trim() === nextHeading.text.trim()
		) {
			previousIndex += 1;
		}

		const previousHeading = previousHeadings[previousIndex];

		if (previousHeading && previousHeading.text.trim() === nextHeading.text.trim()) {
			if (locks[previousIndex] !== undefined) {
				newLocks[nextSceneIndex] = locks[previousIndex];
				workingLocks[nextSceneIndex] = locks[previousIndex];
			}

			previousIndex += 1;
			continue;
		}

		const followingLabel = locks[previousIndex];
		const label = assignInsertedSceneLabel(workingLocks, nextSceneIndex, followingLabel);
		newLocks[nextSceneIndex] = label;
		workingLocks[nextSceneIndex] = label;
	}

	return newLocks;
}

export function sceneNumbersAreLocked(locks: SceneNumberLocks | undefined): boolean {
	return Boolean(locks && Object.keys(locks).length > 0);
}
