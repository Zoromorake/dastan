import type { AiMemory } from './ai-memory-storage';

const DEFAULT_MAX_CHARS = 2_000;
const DEFAULT_MAX_COUNT = 5;

export interface ApprovedMemorySelectionOptions {
	documentId?: string;
	projectId?: string;
	relevanceQuery?: string;
	maxChars?: number;
	maxCount?: number;
}

function tokenize(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.split(/\W+/)
			.filter((token) => token.length > 2),
	);
}

function scoreMemory(memory: AiMemory, queryTokens: Set<string>): number {
	const memoryTokens = tokenize(memory.content);
	let score = 0;

	for (const token of memoryTokens) {
		if (queryTokens.has(token)) {
			score += 1;
		}
	}

	return score;
}

function matchesScope(memory: AiMemory, options: ApprovedMemorySelectionOptions): boolean {
	if (memory.scope === 'global') {
		return true;
	}

	if (memory.scope === 'document') {
		return Boolean(options.documentId) && memory.documentId === options.documentId;
	}

	if (memory.scope === 'project') {
		return Boolean(options.projectId) && memory.projectId === options.projectId;
	}

	return false;
}

/** Approved, unpinned memories ranked by keyword overlap with the current query. */
export function selectRelevantApprovedMemories(
	memories: AiMemory[],
	options: ApprovedMemorySelectionOptions,
): AiMemory[] {
	const query = options.relevanceQuery?.trim();

	if (!query) {
		return [];
	}

	const queryTokens = tokenize(query);

	if (queryTokens.size === 0) {
		return [];
	}

	const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
	const maxCount = options.maxCount ?? DEFAULT_MAX_COUNT;

	const candidates = memories
		.filter(
			(memory) =>
				!memory.pinned &&
				(memory.status ?? 'approved') === 'approved' &&
				matchesScope(memory, options),
		)
		.map((memory) => ({ memory, score: scoreMemory(memory, queryTokens) }))
		.filter((entry) => entry.score > 0)
		.sort((left, right) => right.score - left.score || right.memory.updatedAt.localeCompare(left.memory.updatedAt));

	const selected: AiMemory[] = [];
	let usedChars = 0;

	for (const { memory } of candidates) {
		if (selected.length >= maxCount) {
			break;
		}

		const nextChars = memory.content.length + (selected.length > 0 ? 1 : 0);

		if (usedChars + nextChars > maxChars) {
			continue;
		}

		selected.push(memory);
		usedChars += nextChars;
	}

	return selected;
}

export function formatRelevantApprovedMemories(memories: AiMemory[], options: ApprovedMemorySelectionOptions): string {
	const relevant = selectRelevantApprovedMemories(memories, options);

	if (relevant.length === 0) {
		return '';
	}

	return relevant.map((memory) => `- ${memory.content}`).join('\n');
}
