import type { CodexChunk, CodexItem, CodexReference, CodexStyle } from '@dastan/local-storage';
import { CURATED_APPLIES_WHEN } from './codex-applies-when';

const DEFAULT_MAX_STYLE = 12;
const DEFAULT_MAX_REF_CHARS = 4_000;
const DEFAULT_MAX_REF_CHUNKS = 6;
const PINNED_REF_BODY_CHARS = 2_500;

function tokenize(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.split(/\W+/)
			.filter((token) => token.length > 2),
	);
}

function overlapScore(haystack: string, queryTokens: Set<string>): number {
	if (queryTokens.size === 0) {
		return 0;
	}

	const tokens = tokenize(haystack);
	let score = 0;

	for (const token of tokens) {
		if (queryTokens.has(token)) {
			score += 1;
		}
	}

	return score;
}

function styleMatchText(entry: CodexStyle): string {
	return [
		entry.title,
		entry.instinct,
		entry.rationale ?? '',
		entry.appliesWhen.join(' '),
		entry.tags.join(' '),
		...(entry.exemplars ?? []),
		entry.content,
	].join(' ');
}

export interface StyleSelectionOptions {
	relevanceQuery?: string;
	sceneHints?: string;
	maxCount?: number;
}

/**
 * Pinned styles always included. Unpinned: include all if few, else rank by
 * appliesWhen / tag / keyword overlap with query + scene hints.
 */
export function selectStyleEntriesForContext(
	items: CodexItem[],
	options: StyleSelectionOptions = {},
): CodexStyle[] {
	const styles = items.filter((item): item is CodexStyle => item.type === 'style');
	const pinned = styles.filter((s) => s.pinned);
	const unpinned = styles.filter((s) => !s.pinned);
	const maxCount = options.maxCount ?? DEFAULT_MAX_STYLE;

	const queryBlob = [options.relevanceQuery ?? '', options.sceneHints ?? ''].join(' ').trim();
	const queryTokens = tokenize(queryBlob);
	const curatedInQuery = new Set(
		CURATED_APPLIES_WHEN.filter(
			(tag) =>
				queryBlob.toLowerCase().includes(tag) ||
				queryBlob.toLowerCase().includes(tag.replace(/-/g, ' ')),
		),
	);

	if (unpinned.length + pinned.length <= maxCount && (!queryBlob || unpinned.length <= 6)) {
		return [...pinned, ...unpinned].slice(0, maxCount);
	}

	const ranked = unpinned
		.map((entry) => {
			let score = overlapScore(styleMatchText(entry), queryTokens);

			for (const when of entry.appliesWhen) {
				if (curatedInQuery.has(when as (typeof CURATED_APPLIES_WHEN)[number])) {
					score += 3;
				} else if (queryBlob.toLowerCase().includes(when.toLowerCase())) {
					score += 2;
				}
			}

			for (const tag of entry.tags) {
				if (queryTokens.has(tag.toLowerCase())) {
					score += 1;
				}
			}

			return { entry, score };
		})
		.filter((row) => row.score > 0 || !queryBlob)
		.sort(
			(left, right) =>
				right.score - left.score || right.entry.updatedAt.localeCompare(left.entry.updatedAt),
		);

	const selected: CodexStyle[] = [...pinned];
	const seen = new Set(pinned.map((s) => s.id));

	for (const { entry } of ranked) {
		if (selected.length >= maxCount) {
			break;
		}
		if (seen.has(entry.id)) {
			continue;
		}
		selected.push(entry);
		seen.add(entry.id);
	}

	// If no query and we still have room, fill with recent unpinned
	if (!queryBlob) {
		for (const entry of unpinned) {
			if (selected.length >= maxCount) {
				break;
			}
			if (!seen.has(entry.id)) {
				selected.push(entry);
				seen.add(entry.id);
			}
		}
	}

	return selected;
}

export interface ReferenceChunkSelection {
	chunks: Array<{ title: string; source?: string; heading?: string; text: string; itemId: string }>;
	titles: string[];
}

export interface ReferenceSelectionOptions {
	relevanceQuery?: string;
	maxChars?: number;
	maxChunks?: number;
}

function expandReferenceChunks(ref: CodexReference): Array<{
	heading?: string;
	text: string;
	tags: string[];
}> {
	if (ref.chunks.length > 0) {
		return ref.chunks.map((chunk: CodexChunk) => ({
			heading: chunk.heading,
			text: chunk.text,
			tags: [...chunk.tags, ...ref.tags],
		}));
	}

	const body = ref.content.trim();
	if (!body) {
		return [];
	}

	return [
		{
			text: body.slice(0, PINNED_REF_BODY_CHARS),
			tags: ref.tags,
		},
	];
}

/** Pinned references first (full/short body); then tag/heading retrieval for the rest. */
export function selectRelevantReferenceChunks(
	items: CodexItem[],
	options: ReferenceSelectionOptions = {},
): ReferenceChunkSelection {
	const refs = items.filter((item): item is CodexReference => item.type === 'reference');
	const maxChars = options.maxChars ?? DEFAULT_MAX_REF_CHARS;
	const maxChunks = options.maxChunks ?? DEFAULT_MAX_REF_CHUNKS;
	const query = options.relevanceQuery?.trim() ?? '';
	const queryTokens = tokenize(query);

	const result: ReferenceChunkSelection = { chunks: [], titles: [] };
	let usedChars = 0;
	const titlesSeen = new Set<string>();

	const pushChunk = (
		ref: CodexReference,
		piece: { heading?: string; text: string },
	): boolean => {
		if (result.chunks.length >= maxChunks) {
			return false;
		}

		const text = piece.text.trim();
		if (!text) {
			return true;
		}

		const nextChars = text.length + 40;
		if (usedChars + nextChars > maxChars && result.chunks.length > 0) {
			return false;
		}

		result.chunks.push({
			title: ref.title,
			source: ref.source,
			heading: piece.heading,
			text,
			itemId: ref.id,
		});
		usedChars += nextChars;

		if (!titlesSeen.has(ref.title)) {
			titlesSeen.add(ref.title);
			result.titles.push(ref.title);
		}

		return true;
	};

	const pinned = refs.filter((r) => r.pinned);
	const unpinned = refs.filter((r) => !r.pinned);

	for (const ref of pinned) {
		const pieces = expandReferenceChunks(ref);
		for (const piece of pieces) {
			if (!pushChunk(ref, piece)) {
				return result;
			}
		}
	}

	const candidates = unpinned.flatMap((ref) =>
		expandReferenceChunks(ref).map((piece) => {
			const haystack = [ref.title, ref.source ?? '', piece.heading ?? '', piece.text, ...ref.tags, ...(piece.tags ?? [])].join(
				' ',
			);
			const score = query ? overlapScore(haystack, queryTokens) : 1;
			return { ref, piece, score };
		}),
	);

	const ranked = candidates
		.filter((row) => (query ? row.score > 0 : true))
		.sort((left, right) => right.score - left.score);

	for (const { ref, piece } of ranked) {
		if (!pushChunk(ref, piece)) {
			break;
		}
	}

	return result;
}
