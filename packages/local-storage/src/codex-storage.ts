import { getDatabase } from './screenplay-storage';

export type CodexScope = 'global' | 'project' | 'document';
export type CodexType = 'reference' | 'style';
export type CodexDomain = 'visual' | 'structural' | 'tonal' | 'dialogue' | 'character' | 'other';

export interface CodexChunk {
	id: string;
	heading?: string;
	text: string;
	tags: string[];
}

interface CodexItemBase {
	id: string;
	type: CodexType;
	title: string;
	content: string;
	scope: CodexScope;
	projectId?: string;
	documentId?: string;
	tags: string[];
	pinned: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CodexReference extends CodexItemBase {
	type: 'reference';
	source?: string;
	chunks: CodexChunk[];
}

export interface CodexStyle extends CodexItemBase {
	type: 'style';
	domain: CodexDomain;
	appliesWhen: string[];
	instinct: string;
	rationale?: string;
	exemplars?: string[];
}

export type CodexItem = CodexReference | CodexStyle;

export interface ListCodexOptions {
	documentId?: string;
	projectId?: string;
	/** When true, include every item regardless of scope (Hub "All" view). */
	includeAll?: boolean;
}

function isInScope(item: CodexItem, options: ListCodexOptions): boolean {
	if (options.includeAll) {
		return true;
	}

	if (item.scope === 'global') {
		return true;
	}

	if (item.scope === 'document') {
		return Boolean(options.documentId) && item.documentId === options.documentId;
	}

	if (item.scope === 'project') {
		return Boolean(options.projectId) && item.projectId === options.projectId;
	}

	return false;
}

/** Relevant for editor: document + project scoped + pinned globals (and all globals when includeAllGlobals). */
export function isRelevantCodexItem(
	item: CodexItem,
	options: { documentId?: string; projectId?: string; includeUnpinnedGlobals?: boolean },
): boolean {
	if (item.scope === 'document') {
		return Boolean(options.documentId) && item.documentId === options.documentId;
	}

	if (item.scope === 'project') {
		return Boolean(options.projectId) && item.projectId === options.projectId;
	}

	if (item.scope === 'global') {
		return item.pinned || Boolean(options.includeUnpinnedGlobals);
	}

	return false;
}

export async function listCodexItems(options: ListCodexOptions = {}): Promise<CodexItem[]> {
	const database = await getDatabase();
	const items = (await database.getAll('codex_items')) as CodexItem[];

	return items
		.filter((item) => isInScope(item, options))
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listAllCodexItems(): Promise<CodexItem[]> {
	return listCodexItems({ includeAll: true });
}

export async function getCodexItem(id: string): Promise<CodexItem | undefined> {
	const database = await getDatabase();
	return (await database.get('codex_items', id)) as CodexItem | undefined;
}

export async function saveCodexItem(item: CodexItem): Promise<void> {
	const database = await getDatabase();
	await database.put('codex_items', item, item.id);
}

export async function deleteCodexItem(id: string): Promise<void> {
	const database = await getDatabase();
	await database.delete('codex_items', id);
}

export type CreateCodexReferenceInput = {
	type: 'reference';
	title: string;
	content?: string;
	scope: CodexScope;
	projectId?: string;
	documentId?: string;
	tags?: string[];
	pinned?: boolean;
	source?: string;
	chunks?: CodexChunk[];
};

export type CreateCodexStyleInput = {
	type: 'style';
	title?: string;
	content?: string;
	scope: CodexScope;
	projectId?: string;
	documentId?: string;
	tags?: string[];
	pinned?: boolean;
	domain: CodexDomain;
	appliesWhen?: string[];
	instinct: string;
	rationale?: string;
	exemplars?: string[];
};

export type CreateCodexInput = CreateCodexReferenceInput | CreateCodexStyleInput;

export async function createCodexItem(input: CreateCodexInput): Promise<CodexItem> {
	const now = new Date().toISOString();
	const id = globalThis.crypto.randomUUID();
	const base = {
		id,
		title: (input.title ?? '').trim() || (input.type === 'style' ? 'Style note' : 'Untitled note'),
		content: (input.content ?? '').trim(),
		scope: input.scope,
		projectId: input.projectId,
		documentId: input.documentId,
		tags: input.tags ?? [],
		pinned: input.pinned ?? false,
		createdAt: now,
		updatedAt: now,
	};

	let item: CodexItem;

	if (input.type === 'reference') {
		item = {
			...base,
			type: 'reference',
			source: input.source?.trim() || undefined,
			chunks: input.chunks ?? [],
		};
	} else {
		item = {
			...base,
			type: 'style',
			domain: input.domain,
			appliesWhen: input.appliesWhen ?? [],
			instinct: input.instinct.trim(),
			rationale: input.rationale?.trim() || undefined,
			exemplars: input.exemplars?.map((e) => e.trim()).filter(Boolean) ?? [],
		};
	}

	await saveCodexItem(item);
	return item;
}

export async function updateCodexItem(
	id: string,
	patch: Partial<Omit<CodexReference, 'id' | 'type' | 'createdAt'>> &
		Partial<Omit<CodexStyle, 'id' | 'type' | 'createdAt'>> & { type?: CodexType },
): Promise<CodexItem | undefined> {
	const existing = await getCodexItem(id);
	if (!existing) {
		return undefined;
	}

	const updated: CodexItem = {
		...existing,
		...patch,
		id: existing.id,
		type: existing.type,
		createdAt: existing.createdAt,
		updatedAt: new Date().toISOString(),
	} as CodexItem;

	await saveCodexItem(updated);
	return updated;
}
