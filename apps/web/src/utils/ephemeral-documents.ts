import { createDefaultDocumentLayout } from '@dastan/screenplay-model/layout';
import { createDefaultWorkspaceData, type ScreenplayDocumentRecord } from '../types';
import { DEFAULT_SCRATCH_CONTENT, UNTITLED_SCREENPLAY_TITLE } from './scratch-template';

const ephemeralDocuments = new Map<string, ScreenplayDocumentRecord>();
const EPHEMERAL_SESSION_PREFIX = 'dastan.ephemeral.';

function sessionKey(documentId: string): string {
	return `${EPHEMERAL_SESSION_PREFIX}${documentId}`;
}

function persistEphemeralToSession(document: ScreenplayDocumentRecord): void {
	try {
		sessionStorage.setItem(sessionKey(document.id), JSON.stringify(document));
	} catch {
		// Ignore quota / private-mode failures; in-memory Map remains source of truth for the tab.
	}
}

function readEphemeralFromSession(documentId: string): ScreenplayDocumentRecord | null {
	try {
		const raw = sessionStorage.getItem(sessionKey(documentId));

		if (!raw) {
			return null;
		}

		const parsed = JSON.parse(raw) as ScreenplayDocumentRecord;

		if (!parsed || typeof parsed !== 'object' || parsed.id !== documentId) {
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

function clearEphemeralFromSession(documentId: string): void {
	try {
		sessionStorage.removeItem(sessionKey(documentId));
	} catch {
		// no-op
	}
}

export function isEphemeralDocumentId(documentId: string): boolean {
	return ephemeralDocuments.has(documentId) || readEphemeralFromSession(documentId) !== null;
}

export function getEphemeralDocument(documentId: string): ScreenplayDocumentRecord | null {
	const fromMemory = ephemeralDocuments.get(documentId);

	if (fromMemory) {
		return fromMemory;
	}

	const fromSession = readEphemeralFromSession(documentId);

	if (fromSession) {
		ephemeralDocuments.set(documentId, fromSession);
		return fromSession;
	}

	return null;
}

export function createEphemeralDocument(options?: {
	title?: string;
	withGuide?: boolean;
	projectId?: string;
}): ScreenplayDocumentRecord {
	const now = new Date().toISOString();
	const workspace = createDefaultWorkspaceData();

	if (options?.withGuide) {
		workspace.guide = { active: true, furthestStep: 'spark' };
	}

	const document: ScreenplayDocumentRecord = {
		id: globalThis.crypto.randomUUID(),
		title: options?.title ?? UNTITLED_SCREENPLAY_TITLE,
		createdAt: now,
		updatedAt: now,
		projectId: options?.projectId,
		layout: createDefaultDocumentLayout(),
		workspace,
		content: DEFAULT_SCRATCH_CONTENT,
	};

	ephemeralDocuments.set(document.id, document);
	persistEphemeralToSession(document);
	return document;
}

export function updateEphemeralDocument(document: ScreenplayDocumentRecord): void {
	if (ephemeralDocuments.has(document.id) || readEphemeralFromSession(document.id)) {
		ephemeralDocuments.set(document.id, document);
		persistEphemeralToSession(document);
	}
}

export function discardEphemeralDocument(documentId: string): void {
	ephemeralDocuments.delete(documentId);
	clearEphemeralFromSession(documentId);
}

export function listEphemeralDocuments(): ScreenplayDocumentRecord[] {
	const byId = new Map<string, ScreenplayDocumentRecord>();

	for (const document of ephemeralDocuments.values()) {
		byId.set(document.id, document);
	}

	try {
		for (let index = 0; index < sessionStorage.length; index += 1) {
			const key = sessionStorage.key(index);

			if (!key?.startsWith(EPHEMERAL_SESSION_PREFIX)) {
				continue;
			}

			const documentId = key.slice(EPHEMERAL_SESSION_PREFIX.length);
			const document = readEphemeralFromSession(documentId);

			if (document) {
				byId.set(document.id, document);
				ephemeralDocuments.set(document.id, document);
			}
		}
	} catch {
		// no-op
	}

	return [...byId.values()];
}

export function clearEphemeralDocuments(): void {
	for (const documentId of [...ephemeralDocuments.keys()]) {
		clearEphemeralFromSession(documentId);
	}

	ephemeralDocuments.clear();
}
