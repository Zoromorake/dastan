import type { JSONContent } from '@tiptap/core';
import type {
	ScreenplayDocumentRecord,
	ScreenplayProjectRecord,
	ScreenplayVersionSnapshot,
} from '@dastan/screenplay-model';

export interface DocumentRepository {
	get(id: string): Promise<ScreenplayDocumentRecord | null>;
	save(document: ScreenplayDocumentRecord): Promise<void>;
	list(): Promise<ScreenplayDocumentRecord[]>;
	listActive(): Promise<ScreenplayDocumentRecord[]>;
	listTrashed(): Promise<ScreenplayDocumentRecord[]>;
	create(title: string, content?: JSONContent, projectId?: string): Promise<ScreenplayDocumentRecord>;
	rename(id: string, title: string): Promise<ScreenplayDocumentRecord | null>;
	softDelete(id: string): Promise<void>;
	restore(id: string): Promise<ScreenplayDocumentRecord | null>;
	permanentlyDelete(id: string): Promise<void>;
	moveToProject(documentId: string, projectId: string | null): Promise<ScreenplayDocumentRecord | null>;
	duplicate(id: string): Promise<ScreenplayDocumentRecord | null>;
	loadLast(): Promise<ScreenplayDocumentRecord>;
	setLastDocumentId(id: string): Promise<void>;
	createEmptyContent(): JSONContent;
	purgeExpiredTrash(): Promise<number>;
}

export interface ProjectRepository {
	list(): Promise<ScreenplayProjectRecord[]>;
	get(id: string): Promise<ScreenplayProjectRecord | null>;
	save(project: ScreenplayProjectRecord): Promise<void>;
	create(title: string): Promise<ScreenplayProjectRecord>;
	rename(id: string, title: string): Promise<ScreenplayProjectRecord | null>;
	update(
		id: string,
		patch: Partial<Pick<ScreenplayProjectRecord, 'title' | 'genre' | 'logline' | 'synopsis' | 'coverImageDataUrl'>>,
	): Promise<ScreenplayProjectRecord | null>;
	delete(id: string): Promise<void>;
	duplicate(id: string): Promise<ScreenplayProjectRecord | null>;
	listTrashed(): Promise<ScreenplayProjectRecord[]>;
	restore(id: string): Promise<ScreenplayProjectRecord | null>;
	permanentlyDelete(id: string): Promise<void>;
}

export interface VersionRepository {
	saveSnapshot(document: ScreenplayDocumentRecord): Promise<void>;
	save(version: ScreenplayVersionSnapshot): Promise<void>;
	createManualSnapshot(document: ScreenplayDocumentRecord, label: string): Promise<ScreenplayVersionSnapshot>;
	list(documentId: string): Promise<ScreenplayVersionSnapshot[]>;
	restore(versionId: string): Promise<ScreenplayDocumentRecord | null>;
}

export interface StorageBackend {
	documents: DocumentRepository;
	projects: ProjectRepository;
	versions: VersionRepository;
}
