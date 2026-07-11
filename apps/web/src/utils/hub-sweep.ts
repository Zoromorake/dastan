import type { ScreenplayDocumentRecord } from '../types';
import { isSweepableBlankDraft } from './is-blank-draft';
import { softDeleteDocument } from './screenplay-storage';

export interface SweepResult {
	sweptDocuments: ScreenplayDocumentRecord[];
}

export async function sweepBlankDrafts(documents: ScreenplayDocumentRecord[]): Promise<SweepResult> {
	const sweptDocuments: ScreenplayDocumentRecord[] = [];

	for (const document of documents) {
		if (!isSweepableBlankDraft(document)) {
			continue;
		}

		await softDeleteDocument(document.id);
		sweptDocuments.push(document);
	}

	return { sweptDocuments };
}
