import { describe, expect, it } from 'vitest';
import type { AiMemory } from './ai-memory-storage';
import { countScopedMemories, formatScopedMemories } from './ai-memory-format';

const baseMemory = (overrides: Partial<AiMemory>): AiMemory => ({
	id: '1',
	scope: 'global',
	content: 'Test memory',
	pinned: true,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...overrides,
});

describe('ai-memory-format', () => {
	it('includes only pinned memories when pinnedOnly is true', () => {
		const memories = [
			baseMemory({ id: 'g1', scope: 'global', content: 'Pinned global', pinned: true }),
			baseMemory({ id: 'g2', scope: 'global', content: 'Unpinned global', pinned: false }),
		];

		const formatted = formatScopedMemories(memories, 'global', { pinnedOnly: true });

		expect(formatted).toContain('Pinned global');
		expect(formatted).not.toContain('Unpinned global');
	});

	it('formats project and document scoped memories', () => {
		const memories = [
			baseMemory({ id: 'p1', scope: 'project', projectId: 'proj-1', content: 'Project fact', pinned: true }),
			baseMemory({ id: 'd1', scope: 'document', documentId: 'doc-1', content: 'Script fact', pinned: true }),
			baseMemory({ id: 'd2', scope: 'document', documentId: 'doc-2', content: 'Other script', pinned: true }),
		];

		expect(formatScopedMemories(memories, 'project', { projectId: 'proj-1', pinnedOnly: true })).toContain('Project fact');
		expect(formatScopedMemories(memories, 'document', { documentId: 'doc-1', pinnedOnly: true })).toContain('Script fact');
		expect(formatScopedMemories(memories, 'document', { documentId: 'doc-1', pinnedOnly: true })).not.toContain('Other script');
	});

	it('excludes suggested memories from context', () => {
		const memories = [
			baseMemory({ id: 's1', scope: 'global', content: 'Suggested', pinned: false, status: 'suggested' }),
			baseMemory({ id: 'a1', scope: 'global', content: 'Approved', pinned: true, status: 'approved' }),
		];

		const formatted = formatScopedMemories(memories, 'global', { pinnedOnly: true });
		expect(formatted).toContain('Approved');
		expect(formatted).not.toContain('Suggested');
	});

	it('counts scoped memories', () => {
		const memories = [
			baseMemory({ id: 'g1', scope: 'global', pinned: true }),
			baseMemory({ id: 'g2', scope: 'global', pinned: false }),
			baseMemory({ id: 'p1', scope: 'project', projectId: 'proj-1', pinned: true }),
		];

		expect(countScopedMemories(memories, { projectId: 'proj-1', pinnedOnly: true })).toBe(2);
	});
});
