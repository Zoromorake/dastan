import { openDB, type DBSchema } from 'idb';
import type { JSONContent } from '@tiptap/core';
import { parseScreenplayTextToContent } from './screenplay-text';
import { createDefaultDocumentLayout } from './screenplay-layout';
import { createDefaultWorkspaceData, normalizeWorkspaceData } from '../types';
import { normalizeProjectRecord, type ScreenplayDocumentRecord, type ScreenplayProjectRecord, type ScreenplayVersionSnapshot } from '../types';
import { recordRecentDocument } from './recent-documents';

interface DastanDatabase extends DBSchema {
	documents: {
		key: string;
		value: ScreenplayDocumentRecord;
	};
	projects: {
		key: string;
		value: ScreenplayProjectRecord;
	};
	meta: {
		key: string;
		value: string;
	};
	versions: {
		key: string;
		value: ScreenplayVersionSnapshot;
	};
	ai_memories: {
		key: string;
		value: import('./ai-memory-storage').AiMemory;
	};
	chat_threads: {
		key: string;
		value: import('./ai-memory-storage').AiChatThread;
	};
}

const DATABASE_NAME = 'dastan';
const DATABASE_VERSION = 4;
const LAST_DOCUMENT_KEY = 'lastDocumentId';
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_VERSIONS_PER_DOCUMENT = 20;

const defaultContent: JSONContent = {
	type: 'doc',
	content: [
		{
			type: 'transition',
			content: [{ type: 'text', text: 'FADE IN:' }],
		},
		{
			type: 'scene_heading',
			content: [{ type: 'text', text: 'INT. APARTMENT - DAY' }],
		},
		{
			type: 'action',
			content: [
				{
					type: 'text',
					text: 'Morning light fills a quiet room. A writer opens a fresh script and begins.',
				},
			],
		},
	],
};

function createDocumentRecord(id: string, content: JSONContent = defaultContent, projectId?: string): ScreenplayDocumentRecord {
	const now = new Date().toISOString();

	return {
		id,
		title: 'Untitled',
		createdAt: now,
		updatedAt: now,
		projectId,
		layout: createDefaultDocumentLayout(),
		workspace: createDefaultWorkspaceData(),
		content,
	};
}

function createDocumentRecordWithTitle(id: string, title: string, content: JSONContent = defaultContent, projectId?: string): ScreenplayDocumentRecord {
	const now = new Date().toISOString();

	return {
		id,
		title,
		createdAt: now,
		updatedAt: now,
		projectId,
		layout: createDefaultDocumentLayout(),
		workspace: createDefaultWorkspaceData(),
		content,
	};
}

function createProjectRecord(title: string): ScreenplayProjectRecord {
	return normalizeProjectRecord({
		id: globalThis.crypto.randomUUID(),
		title,
		updatedAt: new Date().toISOString(),
	});
}

function normalizeDocumentRecord(document: ScreenplayDocumentRecord): ScreenplayDocumentRecord {
	return {
		...document,
		layout: document.layout ?? createDefaultDocumentLayout(),
		workspace: normalizeWorkspaceData(document.workspace),
	};
}

async function getDatabase() {
	return openDB<DastanDatabase>(DATABASE_NAME, DATABASE_VERSION, {
		upgrade(database, oldVersion) {
			if (!database.objectStoreNames.contains('documents')) {
				database.createObjectStore('documents');
			}

			if (!database.objectStoreNames.contains('projects')) {
				database.createObjectStore('projects');
			}

			if (!database.objectStoreNames.contains('meta')) {
				database.createObjectStore('meta');
			}

			if (oldVersion < 3 && !database.objectStoreNames.contains('versions')) {
				database.createObjectStore('versions');
			}

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

export async function loadLastDocument(): Promise<ScreenplayDocumentRecord> {
	const database = await getDatabase();
	const lastDocumentId = await database.get('meta', LAST_DOCUMENT_KEY);

	if (lastDocumentId) {
		const existingDocument = await database.get('documents', lastDocumentId);

		if (existingDocument && !existingDocument.deletedAt) {
			return normalizeDocumentRecord(existingDocument);
		}
	}

	const activeDocuments = await getActiveDocuments();

	if (activeDocuments.length > 0) {
		await database.put('meta', activeDocuments[0].id, LAST_DOCUMENT_KEY);
		return activeDocuments[0];
	}

	const document = createDocumentRecord(globalThis.crypto.randomUUID());
	await database.put('documents', document, document.id);
	await database.put('meta', document.id, LAST_DOCUMENT_KEY);
	return document;
}

export async function saveDocument(document: ScreenplayDocumentRecord): Promise<void> {
	const database = await getDatabase();
	const snapshot = normalizeDocumentRecord({
		...document,
		updatedAt: new Date().toISOString(),
	});

	await database.put('documents', snapshot, snapshot.id);
	await setLastDocumentId(snapshot.id);
	recordRecentDocument(snapshot.id);
}

export async function saveVersionSnapshot(document: ScreenplayDocumentRecord): Promise<void> {
	const database = await getDatabase();
	const version: ScreenplayVersionSnapshot = {
		id: globalThis.crypto.randomUUID(),
		documentId: document.id,
		savedAt: new Date().toISOString(),
		title: document.title,
		content: document.content,
	};

	await database.put('versions', version, version.id);

	const allVersions = await database.getAll('versions');
	const documentVersions = allVersions
		.filter((entry) => entry.documentId === document.id)
		.sort((left, right) => right.savedAt.localeCompare(left.savedAt));

	if (documentVersions.length > MAX_VERSIONS_PER_DOCUMENT) {
		const staleVersions = documentVersions.slice(MAX_VERSIONS_PER_DOCUMENT);

		for (const staleVersion of staleVersions) {
			await database.delete('versions', staleVersion.id);
		}
	}
}

export async function getVersionHistory(documentId: string): Promise<ScreenplayVersionSnapshot[]> {
	const database = await getDatabase();
	const versions = await database.getAll('versions');

	return versions
		.filter((version) => version.documentId === documentId)
		.sort((left, right) => right.savedAt.localeCompare(left.savedAt));
}

export async function restoreVersionSnapshot(versionId: string): Promise<ScreenplayDocumentRecord | null> {
	const database = await getDatabase();
	const version = await database.get('versions', versionId);

	if (!version) {
		return null;
	}

	const document = await database.get('documents', version.documentId);

	if (!document || document.deletedAt) {
		return null;
	}

	const restoredDocument = normalizeDocumentRecord({
		...document,
		title: version.title,
		content: version.content,
		updatedAt: new Date().toISOString(),
	});

	await saveDocument(restoredDocument);
	return restoredDocument;
}

export async function getAllDocuments(): Promise<ScreenplayDocumentRecord[]> {
	const database = await getDatabase();
	const documents = await database.getAll('documents');
	return documents.map(normalizeDocumentRecord).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getActiveDocuments(): Promise<ScreenplayDocumentRecord[]> {
	const documents = await getAllDocuments();
	return documents.filter((document) => !document.deletedAt);
}

export async function getTrashedDocuments(): Promise<ScreenplayDocumentRecord[]> {
	const documents = await getAllDocuments();
	return documents
		.filter((document) => document.deletedAt)
		.sort((left, right) => (right.deletedAt ?? '').localeCompare(left.deletedAt ?? ''));
}

export async function createDocument(title: string, content: JSONContent = defaultContent, projectId?: string): Promise<ScreenplayDocumentRecord> {
	const database = await getDatabase();
	const document = createDocumentRecordWithTitle(globalThis.crypto.randomUUID(), title, content, projectId);
	await database.put('documents', document, document.id);
	await setLastDocumentId(document.id);
	recordRecentDocument(document.id);
	return document;
}

export async function getAllProjects(): Promise<ScreenplayProjectRecord[]> {
	const database = await getDatabase();
	const projects = await database.getAll('projects');
	return projects.map(normalizeProjectRecord).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function createProject(title: string): Promise<ScreenplayProjectRecord> {
	const database = await getDatabase();
	const project = createProjectRecord(title);
	await database.put('projects', project, project.id);
	return project;
}

export async function renameProject(id: string, title: string): Promise<ScreenplayProjectRecord | null> {
	return updateProject(id, { title });
}

export async function updateProject(
	id: string,
	updates: Partial<Pick<ScreenplayProjectRecord, 'title' | 'genre' | 'logline' | 'synopsis' | 'coverImageDataUrl'>>,
): Promise<ScreenplayProjectRecord | null> {
	const database = await getDatabase();
	const project = await database.get('projects', id);

	if (!project) {
		return null;
	}

	const updatedProject = normalizeProjectRecord({
		...project,
		...updates,
		updatedAt: new Date().toISOString(),
	});

	await database.put('projects', updatedProject, updatedProject.id);
	return updatedProject;
}

export async function deleteProject(id: string): Promise<void> {
	const database = await getDatabase();
	await database.delete('projects', id);

	const documents = await getAllDocuments();

	for (const document of documents) {
		if (document.projectId === id) {
			await database.put(
				'documents',
				normalizeDocumentRecord({
					...document,
					projectId: undefined,
					updatedAt: new Date().toISOString(),
				}),
				document.id,
			);
		}
	}
}

export async function moveDocumentToProject(documentId: string, projectId: string | null): Promise<ScreenplayDocumentRecord | null> {
	const database = await getDatabase();
	const document = await database.get('documents', documentId);

	if (!document || document.deletedAt) {
		return null;
	}

	if (projectId) {
		const project = await database.get('projects', projectId);

		if (!project) {
			return null;
		}
	}

	const updatedDocument = normalizeDocumentRecord({
		...document,
		projectId: projectId ?? undefined,
		updatedAt: new Date().toISOString(),
	});

	await database.put('documents', updatedDocument, updatedDocument.id);
	return updatedDocument;
}

export async function renameDocument(id: string, title: string): Promise<ScreenplayDocumentRecord | null> {
	const database = await getDatabase();
	const document = await database.get('documents', id);

	if (!document) {
		return null;
	}

	const updatedDocument = normalizeDocumentRecord({
		...document,
		title,
		updatedAt: new Date().toISOString(),
	});

	await database.put('documents', updatedDocument, updatedDocument.id);
	return updatedDocument;
}

export function createTemplateScreenplayContent(template: 'feature' | 'short' | 'tv'): JSONContent {
	switch (template) {
		case 'feature':
			return parseScreenplayTextToContent([
				'FADE IN:',
				'',
				'EXT. CITY STREET - NIGHT',
				'',
				'Rain needles the sidewalk. A lone figure moves under the streetlights.',
				'',
				'MARA',
				'(into recorder)',
				'If this works, nobody hears from me again.',
			].join('\n'));
		case 'short':
			return parseScreenplayTextToContent([
				'INT. APARTMENT KITCHEN - MORNING',
				'',
				'Sunlight cuts across a crowded table. One envelope sits in the center.',
				'',
				'JUNE',
				'Today decides everything.',
			].join('\n'));
		case 'tv':
			return parseScreenplayTextToContent([
				'TEASER',
				'',
				'EXT. SUBURBAN BLOCK - DAWN',
				'',
				'Sprinklers hiss. A garage door creaks open before sunrise.',
				'',
				'CUT TO:',
				'',
				'INT. GARAGE - CONTINUOUS',
				'',
				'A wall of evidence photos stares back.',
			].join('\n'));
	}
}

export async function softDeleteDocument(id: string): Promise<void> {
	const database = await getDatabase();
	const document = await database.get('documents', id);

	if (!document) {
		return;
	}

	const trashedDocument = normalizeDocumentRecord({
		...document,
		deletedAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	});

	await database.put('documents', trashedDocument, trashedDocument.id);

	const activeDocuments = await getActiveDocuments();
	const lastDocumentId = await database.get('meta', LAST_DOCUMENT_KEY);

	if (lastDocumentId === id) {
		await setLastDocumentId(activeDocuments[0]?.id ?? '');
	}
}

export async function restoreDocument(id: string): Promise<ScreenplayDocumentRecord | null> {
	const database = await getDatabase();
	const document = await database.get('documents', id);

	if (!document || !document.deletedAt) {
		return null;
	}

	const restoredDocument = normalizeDocumentRecord({
		...document,
		deletedAt: undefined,
		updatedAt: new Date().toISOString(),
	});

	await database.put('documents', restoredDocument, restoredDocument.id);
	return restoredDocument;
}

export async function permanentlyDeleteDocument(id: string): Promise<void> {
	const database = await getDatabase();
	await database.delete('documents', id);

	const versions = await database.getAll('versions');

	for (const version of versions) {
		if (version.documentId === id) {
			await database.delete('versions', version.id);
		}
	}

	const activeDocuments = await getActiveDocuments();
	const lastDocumentId = await database.get('meta', LAST_DOCUMENT_KEY);

	if (lastDocumentId === id) {
		await setLastDocumentId(activeDocuments[0]?.id ?? '');
	}
}

export async function purgeExpiredTrash(): Promise<number> {
	const database = await getDatabase();
	const documents = await database.getAll('documents');
	const cutoff = Date.now() - TRASH_RETENTION_MS;
	let purgedCount = 0;

	for (const document of documents) {
		if (!document.deletedAt) {
			continue;
		}

		const deletedAtMs = new Date(document.deletedAt).getTime();

		if (deletedAtMs <= cutoff) {
			await permanentlyDeleteDocument(document.id);
			purgedCount += 1;
		}
	}

	return purgedCount;
}

/** @deprecated Use softDeleteDocument instead */
export async function deleteDocument(id: string): Promise<void> {
	await softDeleteDocument(id);
}

export async function setLastDocumentId(id: string): Promise<void> {
	const database = await getDatabase();

	if (id.length === 0) {
		await database.delete('meta', LAST_DOCUMENT_KEY);
		return;
	}

	await database.put('meta', id, LAST_DOCUMENT_KEY);
}

export function createEmptyDocumentContent(): JSONContent {
	return defaultContent;
}

export function createEmptyScreenplayContent(): JSONContent {
	return createEmptyDocumentContent();
}
