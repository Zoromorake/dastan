import type { AiInteractionMode } from './ai-interaction-mode';
import { loadInteractionMode, saveInteractionMode } from './ai-interaction-mode';
import { AUTO_MODEL_ID } from './ai-models';
import {
	defaultScriptContextSections,
	type ScriptContextSections,
} from './ai-script-context-options';

export interface AiDocumentPrefs {
	interactionMode?: AiInteractionMode;
	selectedModel?: string;
	includeScriptContext?: boolean;
	includeWorkspaceContext?: boolean;
	scriptContextSections?: Partial<ScriptContextSections>;
}

const STORAGE_KEY = 'dastan.ai-document-prefs.v1';

function readAll(): Record<string, AiDocumentPrefs> {
	if (typeof window === 'undefined') {
		return {};
	}

	const raw = window.localStorage.getItem(STORAGE_KEY);

	if (!raw) {
		return {};
	}

	try {
		return JSON.parse(raw) as Record<string, AiDocumentPrefs>;
	} catch {
		return {};
	}
}

function writeAll(prefs: Record<string, AiDocumentPrefs>): void {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function loadDocumentAiPrefs(documentId: string): AiDocumentPrefs {
	return readAll()[documentId] ?? {};
}

export function saveDocumentAiPrefs(documentId: string, patch: Partial<AiDocumentPrefs>): AiDocumentPrefs {
	const all = readAll();
	const merged: AiDocumentPrefs = {
		...all[documentId],
		...patch,
		scriptContextSections: {
			...defaultScriptContextSections(),
			...all[documentId]?.scriptContextSections,
			...patch.scriptContextSections,
		},
	};

	all[documentId] = merged;
	writeAll(all);

	if (patch.interactionMode) {
		// DECISION: also update global last-used so new documents inherit the latest choice.
		saveInteractionMode(patch.interactionMode);
	}

	return merged;
}

export function resolveDocumentInteractionMode(documentId: string | null, fallback: AiInteractionMode): AiInteractionMode {
	if (!documentId) {
		return loadInteractionMode(fallback);
	}

	return loadDocumentAiPrefs(documentId).interactionMode ?? loadInteractionMode(fallback);
}

export function resolveDocumentModel(documentId: string | null, globalDefault: string): string {
	if (!documentId) {
		return globalDefault;
	}

	return loadDocumentAiPrefs(documentId).selectedModel ?? globalDefault;
}

export function resolveScriptContextSections(documentId: string | null): ScriptContextSections {
	const stored = documentId ? loadDocumentAiPrefs(documentId).scriptContextSections : undefined;
	return {
		...defaultScriptContextSections(),
		...stored,
	};
}

export function clearDocumentSelectedModel(documentId: string): void {
	const all = readAll();
	const current = all[documentId];

	if (!current?.selectedModel) {
		return;
	}

	const { selectedModel: _removed, ...rest } = current;
	all[documentId] = rest;
	writeAll(all);
}
