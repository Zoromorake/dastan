import { openDB } from 'idb';

export interface AiMemory {
	id: string;
	scope: 'global' | 'document' | 'project';
	documentId?: string;
	projectId?: string;
	content: string;
	pinned: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface AiChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	createdAt: string;
}

export interface AiChatThread {
	id: string;
	documentId: string;
	/** Shared collaboration room id (defaults to documentId when cloud collab is active). */
	roomId?: string;
	title: string;
	model: string;
	provider: string;
	messages: AiChatMessage[];
	createdAt: string;
	updatedAt: string;
}

const DATABASE_NAME = 'dastan';
const DATABASE_VERSION = 4;

async function getAiDatabase() {
	return openDB(DATABASE_NAME, DATABASE_VERSION, {
		upgrade(database, oldVersion) {
			if (oldVersion < 4) {
				if (!database.objectStoreNames.contains('ai_memories')) {
					database.createObjectStore('ai_memories');
				}

				if (!database.objectStoreNames.contains('chat_threads')) {
					database.createObjectStore('chat_threads');
				}
			}
		},
	});
}

export async function listAiMemories(documentId?: string, projectId?: string): Promise<AiMemory[]> {
	const database = await getAiDatabase();
	const memories = (await database.getAll('ai_memories')) as AiMemory[];

	return memories
		.filter((memory) => {
			if (memory.scope === 'global') {
				return true;
			}

			if (memory.scope === 'document') {
				return memory.documentId === documentId;
			}

			if (memory.scope === 'project') {
				return Boolean(projectId) && memory.projectId === projectId;
			}

			return false;
		})
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function saveAiMemory(memory: AiMemory): Promise<void> {
	const database = await getAiDatabase();
	await database.put('ai_memories', memory, memory.id);
}

export async function deleteAiMemory(memoryId: string): Promise<void> {
	const database = await getAiDatabase();
	await database.delete('ai_memories', memoryId);
}

export async function createAiMemory(input: {
	scope: AiMemory['scope'];
	documentId?: string;
	projectId?: string;
	content: string;
	pinned?: boolean;
}): Promise<AiMemory> {
	const now = new Date().toISOString();
	const memory: AiMemory = {
		id: globalThis.crypto.randomUUID(),
		scope: input.scope,
		documentId: input.documentId,
		projectId: input.projectId,
		content: input.content.trim(),
		pinned: input.pinned ?? true,
		createdAt: now,
		updatedAt: now,
	};

	await saveAiMemory(memory);
	return memory;
}

export async function listChatThreads(documentId: string): Promise<AiChatThread[]> {
	const database = await getAiDatabase();
	const threads = (await database.getAll('chat_threads')) as AiChatThread[];

	return threads
		.filter((thread) => thread.documentId === documentId)
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getChatThread(threadId: string): Promise<AiChatThread | undefined> {
	const database = await getAiDatabase();
	return (await database.get('chat_threads', threadId)) as AiChatThread | undefined;
}

export async function saveChatThread(thread: AiChatThread): Promise<AiChatThread> {
	const database = await getAiDatabase();
	const savedThread = {
		...thread,
		updatedAt: new Date().toISOString(),
	};

	await database.put('chat_threads', savedThread, savedThread.id);
	return savedThread;
}

export async function deleteChatThread(threadId: string): Promise<void> {
	const database = await getAiDatabase();
	await database.delete('chat_threads', threadId);
}

export async function createChatThread(input: {
	documentId: string;
	roomId?: string;
	title?: string;
	model: string;
	provider: string;
}): Promise<AiChatThread> {
	const now = new Date().toISOString();
	const thread: AiChatThread = {
		id: globalThis.crypto.randomUUID(),
		documentId: input.documentId,
		roomId: input.roomId,
		title: input.title?.trim() || 'New chat',
		model: input.model,
		provider: input.provider,
		messages: [],
		createdAt: now,
		updatedAt: now,
	};

	await saveChatThread(thread);
	return thread;
}
