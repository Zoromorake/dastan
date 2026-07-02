import type { AiMemory } from './ai-memory-storage';

export interface MemoryFormatOptions {
	documentId?: string;
	projectId?: string;
	/** When true, only memories with pinned === true are included. */
	pinnedOnly?: boolean;
}

function filterMemories(memories: AiMemory[], options: MemoryFormatOptions): AiMemory[] {
	return memories.filter((memory) => {
		if (options.pinnedOnly && !memory.pinned) {
			return false;
		}

		if (memory.scope === 'global') {
			return true;
		}

		if (memory.scope === 'document') {
			return memory.documentId === options.documentId;
		}

		if (memory.scope === 'project') {
			return Boolean(options.projectId) && memory.projectId === options.projectId;
		}

		return false;
	});
}

export function formatScopedMemories(
	memories: AiMemory[],
	scope: AiMemory['scope'],
	options: MemoryFormatOptions,
): string {
	const scoped = filterMemories(memories, options).filter((memory) => memory.scope === scope);

	if (scoped.length === 0) {
		return '';
	}

	return scoped.map((memory) => `- ${memory.content}`).join('\n');
}

export function countScopedMemories(memories: AiMemory[], options: MemoryFormatOptions): number {
	return filterMemories(memories, options).length;
}
