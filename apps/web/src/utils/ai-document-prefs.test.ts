import { beforeEach, describe, expect, it } from 'vitest';
import {
	loadDocumentAiPrefs,
	resolveDocumentInteractionMode,
	saveDocumentAiPrefs,
} from './ai-document-prefs';
import { saveInteractionMode } from './ai-interaction-mode';

describe('ai-document-prefs', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('persists interaction mode per document', () => {
		saveDocumentAiPrefs('doc-1', { interactionMode: 'ask' });
		expect(loadDocumentAiPrefs('doc-1').interactionMode).toBe('ask');
		saveInteractionMode('planner');
		expect(resolveDocumentInteractionMode('doc-2', 'planner')).toBe('planner');
	});

	it('falls back to global last-used mode', () => {
		saveInteractionMode('editor');
		expect(resolveDocumentInteractionMode('unknown-doc', 'planner')).toBe('editor');
	});
});
