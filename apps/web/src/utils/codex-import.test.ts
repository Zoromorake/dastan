import { describe, expect, it } from 'vitest';
import { chunkMarkdownByHeadings, parseCodexImportFile } from './codex-import';
import { selectStyleEntriesForContext, selectRelevantReferenceChunks } from './codex-retrieve';
import { formatCodexForContext } from './codex-format';
import type { CodexItem, CodexReference, CodexStyle } from './codex-storage';

describe('chunkMarkdownByHeadings', () => {
	it('keeps short notes unchunked', () => {
		const result = chunkMarkdownByHeadings('A short craft note about midpoints.');
		expect(result.chunks).toEqual([]);
		expect(result.content).toContain('midpoints');
	});

	it('splits long markdown on headings', () => {
		const body = [
			'# Save the Cat',
			'',
			'Intro paragraph that is long enough to matter.',
			'',
			'## Opening Image',
			'',
			'The first image sets tone and world.',
			'',
			'## Midpoint',
			'',
			'False victory or false defeat — raise the stakes.',
		].join('\n');

		const padded = `${body}\n\n${'x'.repeat(1_200)}`;
		const result = chunkMarkdownByHeadings(padded);

		expect(result.chunks.length).toBeGreaterThanOrEqual(2);
		expect(result.chunks.some((chunk) => chunk.heading === 'Midpoint')).toBe(true);
		expect(result.suggestedTitle).toBe('Save the Cat');
	});

	it('uses file name for import title when helpful', () => {
		const result = parseCodexImportFile('save-the-cat.md', 'Notes without a heading title line.');
		expect(result.suggestedTitle).toBe('save-the-cat');
	});
});

describe('codex retrieval', () => {
	const styleIntimate: CodexStyle = {
		id: 's1',
		type: 'style',
		title: 'Eyes',
		content: '',
		scope: 'global',
		tags: [],
		pinned: false,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		domain: 'visual',
		appliesWhen: ['intimate', 'quiet-beat'],
		instinct: 'Hold on eyes in quiet emotional beats',
		rationale: 'A stare held long enough to feel something',
	};

	const styleSpectacle: CodexStyle = {
		id: 's2',
		type: 'style',
		title: 'CGI scale',
		content: '',
		scope: 'global',
		tags: [],
		pinned: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		domain: 'visual',
		appliesWhen: ['spectacle', 'impossible-scale'],
		instinct: 'Embrace CGI when depicting the impossible',
	};

	const reference: CodexReference = {
		id: 'r1',
		type: 'reference',
		title: 'Save the Cat',
		content: 'Full book notes',
		scope: 'global',
		tags: ['structure'],
		pinned: false,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		source: 'Blake Snyder',
		chunks: [
			{
				id: 'c1',
				heading: 'Midpoint',
				text: 'The midpoint is a false victory or false defeat.',
				tags: ['midpoint'],
			},
			{
				id: 'c2',
				heading: 'Opening Image',
				text: 'Sets tone before the catalyst.',
				tags: ['opening'],
			},
		],
	};

	it('always includes pinned styles and ranks by appliesWhen', () => {
		const selected = selectStyleEntriesForContext([styleIntimate, styleSpectacle], {
			relevanceQuery: 'this quiet intimate scene between two characters',
		});

		expect(selected.some((entry) => entry.id === 's2')).toBe(true);
		expect(selected.some((entry) => entry.id === 's1')).toBe(true);
	});

	it('retrieves reference chunks by keyword', () => {
		const result = selectRelevantReferenceChunks([reference], {
			relevanceQuery: 'how should the midpoint land',
		});

		expect(result.chunks.length).toBeGreaterThan(0);
		expect(result.chunks[0]?.heading).toBe('Midpoint');
	});

	it('formats distinct style and reference sections', () => {
		const items: CodexItem[] = [styleIntimate, styleSpectacle, reference];
		const formatted = formatCodexForContext(items, {
			relevanceQuery: 'intimate midpoint',
		});

		expect(formatted.styleSection).toContain("Writer's articulated style");
		expect(formatted.styleSection).toContain('Hold on eyes');
		expect(formatted.referenceSection).toContain('Reference notes');
	});
});
