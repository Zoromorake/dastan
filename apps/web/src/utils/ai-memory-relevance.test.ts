import { describe, expect, it } from 'vitest';
import type { AiMemory } from './ai-memory-storage';
import { selectRelevantApprovedMemories } from './ai-memory-relevance';

const baseMemory = (overrides: Partial<AiMemory>): AiMemory => ({
	id: '1',
	scope: 'global',
	content: 'Test memory',
	pinned: false,
	status: 'approved',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...overrides,
});

describe('ai-memory-relevance', () => {
	it('returns approved unpinned memories that overlap with the query', () => {
		const memories = [
			baseMemory({ id: 'a', content: 'Sarah hates coffee in the morning', pinned: false }),
			baseMemory({ id: 'b', content: 'The villain works at the harbor', pinned: false }),
			baseMemory({ id: 'c', content: 'Pinned coffee note', pinned: true }),
		];

		const selected = selectRelevantApprovedMemories(memories, {
			relevanceQuery: 'coffee scene rewrite',
		});

		expect(selected.map((memory) => memory.id)).toEqual(['a']);
	});

	it('excludes suggested and pinned memories', () => {
		const memories = [
			baseMemory({ id: 's', content: 'coffee subplot', status: 'suggested' }),
			baseMemory({ id: 'p', content: 'coffee pinned', pinned: true }),
		];

		const selected = selectRelevantApprovedMemories(memories, {
			relevanceQuery: 'coffee',
		});

		expect(selected).toHaveLength(0);
	});

	it('respects document scope', () => {
		const memories = [
			baseMemory({ id: 'd1', scope: 'document', documentId: 'doc-1', content: 'hero backstory' }),
			baseMemory({ id: 'd2', scope: 'document', documentId: 'doc-2', content: 'hero backstory other script' }),
		];

		const selected = selectRelevantApprovedMemories(memories, {
			documentId: 'doc-1',
			relevanceQuery: 'hero arc',
		});

		expect(selected.map((memory) => memory.id)).toEqual(['d1']);
	});
});
