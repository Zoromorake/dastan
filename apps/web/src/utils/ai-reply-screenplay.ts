import {
	getScreenplayBlocksFromContent,
	parseScreenplayTextToContent,
	type ScreenplayBlockText,
} from '@dastan/fountain-parser';
import { looksLikeScreenplayText } from './insert-screenplay-text';

export type AssistantContentSegment =
	| { kind: 'markdown'; text: string }
	| { kind: 'screenplay'; text: string };

const FENCE_RE = /```(?:screenplay|fountain)\s*\n([\s\S]*?)```/gi;
const SCREENPLAY_START_RE =
	/^(INT\.|EXT\.|INT\/EXT\.?|I\/E\.|FADE IN|FADE OUT|CUT TO|[A-Z][A-Z0-9 .'\-]{1,40})$/;
const CHARACTER_CUE_RE = /^[A-Z][A-Z0-9 .'\-]{1,40}$/;

function pushMarkdown(segments: AssistantContentSegment[], text: string) {
	if (!text) {
		return;
	}

	segments.push({ kind: 'markdown', text });
}

function pushScreenplay(segments: AssistantContentSegment[], text: string) {
	const trimmed = text.trim();

	if (!trimmed) {
		return;
	}

	segments.push({ kind: 'screenplay', text: trimmed });
}

/** Split fenced ```screenplay / ```fountain blocks out of assistant markdown. */
function splitFencedScreenplay(text: string): AssistantContentSegment[] {
	const segments: AssistantContentSegment[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(FENCE_RE)) {
		const start = match.index ?? 0;
		pushMarkdown(segments, text.slice(lastIndex, start));
		pushScreenplay(segments, match[1] ?? '');
		lastIndex = start + match[0].length;
	}

	pushMarkdown(segments, text.slice(lastIndex));
	return segments.length > 0 ? segments : [{ kind: 'markdown', text }];
}

/** Reply-oriented detector — paste helper requires indented cues; AI text usually does not. */
export function looksLikeScreenplayReply(text: string): boolean {
	if (looksLikeScreenplayText(text)) {
		return true;
	}

	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

	if (lines.length < 2) {
		return false;
	}

	const hasScene = lines.some((line) => /^(INT\.|EXT\.|INT\/EXT\.?|I\/E\.)/i.test(line));
	const hasCharacter = lines.some((line) => CHARACTER_CUE_RE.test(line) && line.length <= 40);

	if (hasScene && (hasCharacter || lines.length >= 3)) {
		return true;
	}

	if (hasCharacter) {
		const characterIndex = lines.findIndex((line) => CHARACTER_CUE_RE.test(line));
		return characterIndex >= 0 && characterIndex < lines.length - 1;
	}

	try {
		const blocks = getScreenplayBlocksFromContent(parseScreenplayTextToContent(text));
		const types = new Set(blocks.map((block) => block.type));
		return (
			(types.has('scene_heading') && blocks.length >= 2) ||
			(types.has('character') && types.has('dialogue'))
		);
	} catch {
		return false;
	}
}

function isPromotableScreenplayChunk(chunk: string): boolean {
	const nonEmpty = chunk
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

	return nonEmpty.length >= 2 && looksLikeScreenplayReply(chunk);
}

function looksLikeScreenplayStart(paragraph: string): boolean {
	const firstLine = paragraph
		.split('\n')
		.map((line) => line.trim())
		.find(Boolean);

	return Boolean(firstLine && SCREENPLAY_START_RE.test(firstLine));
}

function joinParagraphs(
	paragraphs: Array<{ text: string; trailing: string }>,
	start: number,
	end: number,
	includeFinalTrailing: boolean,
): string {
	return paragraphs
		.slice(start, end + 1)
		.map((paragraph, offset, slice) => {
			const isLast = offset === slice.length - 1;
			if (isLast) {
				return includeFinalTrailing ? paragraph.text + paragraph.trailing : paragraph.text;
			}

			return paragraph.text + paragraph.trailing;
		})
		.join('');
}

/**
 * Promote blank-line-separated paragraph runs that look like screenplay.
 * During streaming, only promote runs closed by a trailing blank line or
 * followed by more content (not the still-growing tail).
 */
function promoteHeuristicScreenplay(
	markdown: string,
	options: { streaming: boolean },
): AssistantContentSegment[] {
	const pieces = markdown.split(/(\n{2,})/);
	const paragraphs: Array<{ text: string; trailing: string }> = [];
	let leading = '';

	for (let index = 0; index < pieces.length; index += 1) {
		const piece = pieces[index] ?? '';

		if (/^\n{2,}$/.test(piece)) {
			if (paragraphs.length === 0) {
				leading += piece;
			}

			continue;
		}

		if (!piece) {
			continue;
		}

		const next = pieces[index + 1];
		const trailing = typeof next === 'string' && /^\n{2,}$/.test(next) ? next : '';

		if (trailing) {
			index += 1;
		}

		paragraphs.push({ text: piece, trailing });
	}

	const segments: AssistantContentSegment[] = [];
	pushMarkdown(segments, leading);

	let index = 0;

	while (index < paragraphs.length) {
		if (!looksLikeScreenplayStart(paragraphs[index]!.text)) {
			const paragraph = paragraphs[index]!;
			pushMarkdown(segments, paragraph.text + paragraph.trailing);
			index += 1;
			continue;
		}

		let bestEnd = -1;

		for (let end = index; end < Math.min(paragraphs.length, index + 14); end += 1) {
			const joined = joinParagraphs(paragraphs, index, end, false);

			if (isPromotableScreenplayChunk(joined)) {
				bestEnd = end;
			}
		}

		if (bestEnd < 0) {
			const paragraph = paragraphs[index]!;
			pushMarkdown(segments, paragraph.text + paragraph.trailing);
			index += 1;
			continue;
		}

		const isTail = bestEnd === paragraphs.length - 1;
		const closed = !options.streaming || !isTail || Boolean(paragraphs[bestEnd]?.trailing);

		if (!closed) {
			for (let cursor = index; cursor < paragraphs.length; cursor += 1) {
				const paragraph = paragraphs[cursor]!;
				pushMarkdown(segments, paragraph.text + paragraph.trailing);
			}

			break;
		}

		// Prefer not swallowing trailing prose paragraphs that aren't screenplay.
		while (bestEnd > index) {
			const withoutLast = joinParagraphs(paragraphs, index, bestEnd - 1, false);
			const lastParagraph = paragraphs[bestEnd]!.text.trim();

			if (
				isPromotableScreenplayChunk(withoutLast) &&
				!looksLikeScreenplayStart(lastParagraph) &&
				!CHARACTER_CUE_RE.test(lastParagraph.split('\n')[0] ?? '')
			) {
				bestEnd -= 1;
				continue;
			}

			break;
		}

		pushScreenplay(segments, joinParagraphs(paragraphs, index, bestEnd, false));
		pushMarkdown(segments, paragraphs[bestEnd]?.trailing ?? '');
		index = bestEnd + 1;
	}

	return segments.length > 0 ? segments : [{ kind: 'markdown', text: markdown }];
}

function mergeAdjacent(segments: AssistantContentSegment[]): AssistantContentSegment[] {
	const merged: AssistantContentSegment[] = [];

	for (const segment of segments) {
		const previous = merged[merged.length - 1];

		if (previous && previous.kind === 'markdown' && segment.kind === 'markdown') {
			previous.text += segment.text;
			continue;
		}

		merged.push({ ...segment });
	}

	return merged.filter((segment) => segment.text.length > 0);
}

/** Segment assistant reply text into markdown vs screenplay for chat rendering. */
export function splitAssistantContent(
	text: string,
	options?: { streaming?: boolean },
): AssistantContentSegment[] {
	const streaming = options?.streaming ?? false;
	const fenced = splitFencedScreenplay(text);
	const segments: AssistantContentSegment[] = [];

	for (const segment of fenced) {
		if (segment.kind === 'screenplay') {
			segments.push(segment);
			continue;
		}

		if (!segment.text.trim()) {
			pushMarkdown(segments, segment.text);
			continue;
		}

		segments.push(...promoteHeuristicScreenplay(segment.text, { streaming }));
	}

	return mergeAdjacent(segments);
}

/** Parse screenplay text into typed lines for Courier rendering. */
export function parseReplyScreenplayBlocks(text: string): ScreenplayBlockText[] {
	try {
		const content = parseScreenplayTextToContent(text);
		const blocks = getScreenplayBlocksFromContent(content);

		if (blocks.length > 0) {
			return blocks;
		}
	} catch {
		// Fall through to plain action lines.
	}

	return text
		.split('\n')
		.map((line) => line.trimEnd())
		.filter((line) => line.trim().length > 0)
		.map((line) => ({ type: 'action' as const, text: line.trim() }));
}
