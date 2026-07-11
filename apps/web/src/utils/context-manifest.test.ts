import { describe, expect, it } from 'vitest';
import { createDefaultWorkspaceData } from '../types';
import { defaultScriptContextSections } from './ai-script-context-options';
import { buildContextManifest, formatTokenLabel, toStoredContextManifest, manifestFromStored } from './context-manifest';

describe('buildContextManifest', () => {
	it('includes global rules and selection when present', () => {
		const manifest = buildContextManifest({
			documentContent: null,
			workspace: createDefaultWorkspaceData(),
			globalRules: 'Write in present tense.',
			memories: [],
			includeScriptContext: false,
			includeWorkspaceContext: false,
			scriptContextSections: defaultScriptContextSections(),
			selectionText: 'Hello world',
		});

		expect(manifest.sections.some((section) => section.id === 'global_rules')).toBe(true);
		expect(manifest.sections.some((section) => section.id === 'selection')).toBe(true);
		expect(manifest.totalTokenEstimate).toBeGreaterThan(0);
	});

	it('round-trips stored manifest without content payloads', () => {
		const manifest = buildContextManifest({
			documentContent: null,
			workspace: createDefaultWorkspaceData(),
			globalRules: 'Rule',
			memories: [],
			includeScriptContext: false,
			includeWorkspaceContext: false,
			scriptContextSections: defaultScriptContextSections(),
		});

		const stored = toStoredContextManifest(manifest);
		const restored = manifestFromStored(stored);

		expect(restored.totalCharCount).toBe(manifest.totalCharCount);
		expect(stored.sections.every((section) => typeof section.charCount === 'number')).toBe(true);
	});
});

describe('formatTokenLabel', () => {
	it('formats thousands compactly', () => {
		expect(formatTokenLabel(1500)).toBe('~1.5k');
		expect(formatTokenLabel(400)).toBe('~400');
	});
});
