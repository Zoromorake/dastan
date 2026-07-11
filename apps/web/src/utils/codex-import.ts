import type { CodexChunk } from '@dastan/local-storage';

const HEADING_RE = /^(#{1,6})\s+(.+)$/gm;
const MIN_CHUNK_CHARS_FOR_SPLIT = 1_200;

export interface CodexImportResult {
	content: string;
	chunks: CodexChunk[];
	suggestedTitle: string;
}

function slugTag(heading: string): string {
	return heading
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.slice(0, 48);
}

/**
 * Split markdown/plain text on ATX headings. Short notes stay as a single body
 * with empty chunks; long imports get heading-based chunks for retrieval.
 */
export function chunkMarkdownByHeadings(
	raw: string,
	options: { baseTags?: string[] } = {},
): CodexImportResult {
	const content = raw.replace(/\r\n/g, '\n').trim();
	const baseTags = options.baseTags ?? [];

	if (!content) {
		return { content: '', chunks: [], suggestedTitle: 'Untitled note' };
	}

	const firstLine = content.split('\n').find((line) => line.trim()) ?? 'Untitled note';
	const suggestedTitle = firstLine.replace(/^#+\s*/, '').trim().slice(0, 80) || 'Untitled note';

	if (content.length < MIN_CHUNK_CHARS_FOR_SPLIT) {
		return { content, chunks: [], suggestedTitle };
	}

	const matches = [...content.matchAll(HEADING_RE)];

	if (matches.length === 0) {
		// No headings — split into ~2k char paragraphs groups
		const chunks: CodexChunk[] = [];
		const paragraphs = content.split(/\n{2,}/);
		let buffer = '';
		let index = 0;

		for (const para of paragraphs) {
			if (buffer.length + para.length > 2_000 && buffer.trim()) {
				chunks.push({
					id: globalThis.crypto.randomUUID(),
					text: buffer.trim(),
					tags: [...baseTags, `part-${index + 1}`],
				});
				index += 1;
				buffer = para;
			} else {
				buffer = buffer ? `${buffer}\n\n${para}` : para;
			}
		}

		if (buffer.trim()) {
			chunks.push({
				id: globalThis.crypto.randomUUID(),
				text: buffer.trim(),
				tags: [...baseTags, `part-${index + 1}`],
			});
		}

		return { content, chunks, suggestedTitle };
	}

	const chunks: CodexChunk[] = [];
	const preamble = content.slice(0, matches[0].index ?? 0).trim();

	if (preamble) {
		chunks.push({
			id: globalThis.crypto.randomUUID(),
			heading: 'Introduction',
			text: preamble,
			tags: [...baseTags, 'introduction'],
		});
	}

	for (let i = 0; i < matches.length; i += 1) {
		const match = matches[i];
		const heading = match[2].trim();
		const start = (match.index ?? 0) + match[0].length;
		const end = i + 1 < matches.length ? (matches[i + 1].index ?? content.length) : content.length;
		const text = content.slice(start, end).trim();

		if (!text && !heading) {
			continue;
		}

		chunks.push({
			id: globalThis.crypto.randomUUID(),
			heading,
			text: text || heading,
			tags: [...baseTags, slugTag(heading)].filter(Boolean),
		});
	}

	return { content, chunks, suggestedTitle };
}

export function parseCodexImportFile(fileName: string, text: string): CodexImportResult {
	const result = chunkMarkdownByHeadings(text);
	const fromName = fileName.replace(/\.(md|txt|markdown)$/i, '').trim();

	if (fromName && result.suggestedTitle === 'Untitled note') {
		return { ...result, suggestedTitle: fromName };
	}

	if (fromName && !result.suggestedTitle.toLowerCase().includes(fromName.toLowerCase().slice(0, 12))) {
		return { ...result, suggestedTitle: fromName };
	}

	return result;
}
