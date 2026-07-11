import type { CodexItem, CodexReference, CodexStyle } from '@dastan/local-storage';
import { isRelevantCodexItem } from '@dastan/local-storage';
import { selectRelevantReferenceChunks, selectStyleEntriesForContext } from './codex-retrieve';

export interface CodexFormatOptions {
	documentId?: string;
	projectId?: string;
	relevanceQuery?: string;
	/** Extra tokens from scene heading / beat labels for appliesWhen matching */
	sceneHints?: string;
	maxStyleEntries?: number;
	maxReferenceChars?: number;
	maxReferenceChunks?: number;
}

export interface FormattedCodexContext {
	styleSection: string;
	referenceSection: string;
	styleEntries: CodexStyle[];
	referenceTitles: string[];
	styleCharCount: number;
	referenceCharCount: number;
}

function formatStyleLine(entry: CodexStyle): string {
	const when = entry.appliesWhen.length > 0 ? entry.appliesWhen.join(', ') : 'general';
	const lines = [`[${entry.domain} · ${when}] ${entry.instinct}`];

	if (entry.rationale?.trim()) {
		lines.push(`  Why: ${entry.rationale.trim()}`);
	}

	if (entry.exemplars && entry.exemplars.length > 0) {
		lines.push(`  Exemplars: ${entry.exemplars.join('; ')}`);
	}

	return lines.join('\n');
}

export function formatStyleEntriesSection(entries: CodexStyle[]): string {
	if (entries.length === 0) {
		return '';
	}

	return `## Writer's articulated style\nTreat these as directives for suggestions — not optional documents.\n${entries.map(formatStyleLine).join('\n')}`;
}

export function formatReferenceNotesSection(
	chunks: Array<{ title: string; source?: string; heading?: string; text: string }>,
): string {
	if (chunks.length === 0) {
		return '';
	}

	const body = chunks
		.map((chunk) => {
			const header = [chunk.title, chunk.source, chunk.heading].filter(Boolean).join(' — ');
			return `### ${header}\n${chunk.text}`;
		})
		.join('\n\n');

	return `## Reference notes\nCite these craft notes when relevant.\n${body}`;
}

/** Build both Codex prompt sections from a full item list. */
export function formatCodexForContext(
	items: CodexItem[],
	options: CodexFormatOptions = {},
): FormattedCodexContext {
	const scoped = items.filter((item) =>
		isRelevantCodexItem(item, {
			documentId: options.documentId,
			projectId: options.projectId,
			includeUnpinnedGlobals: true,
		}),
	);

	const styles = selectStyleEntriesForContext(scoped, {
		relevanceQuery: options.relevanceQuery,
		sceneHints: options.sceneHints,
		maxCount: options.maxStyleEntries,
	});

	const styleSection = formatStyleEntriesSection(styles);
	const retrieved = selectRelevantReferenceChunks(scoped, {
		relevanceQuery: options.relevanceQuery,
		maxChars: options.maxReferenceChars,
		maxChunks: options.maxReferenceChunks,
	});

	const referenceSection = formatReferenceNotesSection(retrieved.chunks);

	return {
		styleSection,
		referenceSection,
		styleEntries: styles,
		referenceTitles: retrieved.titles,
		styleCharCount: styleSection.length,
		referenceCharCount: referenceSection.length,
	};
}

export function isCodexStyle(item: CodexItem): item is CodexStyle {
	return item.type === 'style';
}

export function isCodexReference(item: CodexItem): item is CodexReference {
	return item.type === 'reference';
}

export function groupStylesByDomain(styles: CodexStyle[]): Record<string, CodexStyle[]> {
	const groups: Record<string, CodexStyle[]> = {};

	for (const style of styles) {
		const key = style.domain;
		if (!groups[key]) {
			groups[key] = [];
		}
		groups[key].push(style);
	}

	return groups;
}
