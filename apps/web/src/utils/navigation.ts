import type { ScreenplayDocumentRecord } from '../types';

export function getHubPathForDocument(document: Pick<ScreenplayDocumentRecord, 'projectId'> | null | undefined): string {
	if (document?.projectId) {
		return `/project/${document.projectId}`;
	}

	return '/';
}

export function resolveInitialDocumentId(urlDocumentId: string | undefined, lastDocumentId: string | null): string | null {
	if (urlDocumentId) {
		return urlDocumentId;
	}

	return lastDocumentId;
}
