import type { JSONContent } from '@tiptap/core';
import type { ScreenplayWorkspaceData } from '../types';
import type { AiMemory } from './ai-memory-storage';
import type { CodexItem } from './codex-storage';
import { estimateTokensFromChars } from './ai-context-estimate';
import { formatWorkspaceSummary } from './ai-context';
import { MAX_SCRIPT_CHARS } from './ai-context-script';
import { estimateScriptContextSections } from './ai-context-script-sections';
import type { ScriptContextSections } from './ai-script-context-options';
import { selectRelevantApprovedMemories } from './ai-memory-relevance';
import { formatCodexForContext } from './codex-format';
import { toPlainTextScreenplay } from './screenplay-text';

export type ContextManifestSectionId =
	| 'active_scene'
	| 'neighboring_scenes'
	| 'scene_outline'
	| 'rolling_summary'
	| 'other_scene_excerpts'
	| 'script_opening'
	| 'script_ending'
	| 'full_script'
	| 'workspace_summary'
	| 'selection'
	| 'pinned_memories'
	| 'approved_memories'
	| 'style_entries'
	| 'reference_notes'
	| 'global_rules'
	| 'document_rules'
	| 'mode_instructions'
	| 'collaborators';

export interface ContextManifestSection {
	id: ContextManifestSectionId;
	label: string;
	charCount: number;
	tokenEstimate: number;
	/** false = informational only (always on when parent toggle is on) */
	toggleable: boolean;
	enabled: boolean;
	/** Memory titles when section is pinned_memories */
	detail?: string[];
}

export interface ContextManifest {
	sections: ContextManifestSection[];
	totalCharCount: number;
	totalTokenEstimate: number;
	budgetTokens: number;
}

export interface BuildContextManifestInput {
	documentContent: JSONContent | null;
	workspace: ScreenplayWorkspaceData;
	globalRules: string;
	documentRules?: string;
	memories: AiMemory[];
	codexItems?: CodexItem[];
	includeScriptContext: boolean;
	includeWorkspaceContext: boolean;
	scriptContextSections: ScriptContextSections;
	documentId?: string;
	projectId?: string;
	selectionText?: string | null;
	activeBlockIndex?: number | null;
	relevanceQuery?: string;
	budgetTokens?: number;
}

export function sectionTokens(charCount: number): number {
	return estimateTokensFromChars(charCount);
}

export function buildContextManifest(input: BuildContextManifestInput): ContextManifest {
	const budgetTokens = input.budgetTokens ?? 32_000;
	const sections: ContextManifestSection[] = [];

	if (input.globalRules.trim()) {
		const charCount = input.globalRules.trim().length;
		sections.push({
			id: 'global_rules',
			label: 'Global writer rules',
			charCount,
			tokenEstimate: sectionTokens(charCount),
			toggleable: false,
			enabled: true,
		});
	}

	if (input.documentRules?.trim()) {
		const charCount = input.documentRules.trim().length;
		sections.push({
			id: 'document_rules',
			label: 'Script writer rules',
			charCount,
			tokenEstimate: sectionTokens(charCount),
			toggleable: false,
			enabled: true,
		});
	}

	const pinnedMemories = input.memories.filter((m) => m.pinned && (m.status ?? 'approved') !== 'suggested');

	if (pinnedMemories.length > 0) {
		const text = pinnedMemories.map((m) => m.content).join('\n');
		sections.push({
			id: 'pinned_memories',
			label: `Pinned memories (${pinnedMemories.length})`,
			charCount: text.length,
			tokenEstimate: sectionTokens(text.length),
			toggleable: false,
			enabled: true,
			detail: pinnedMemories.map((m) => m.content.slice(0, 80)),
		});
	}

	const approvedRelevant = selectRelevantApprovedMemories(input.memories, {
		documentId: input.documentId,
		projectId: input.projectId,
		relevanceQuery: input.relevanceQuery,
	});

	if (approvedRelevant.length > 0) {
		const text = approvedRelevant.map((m) => m.content).join('\n');
		sections.push({
			id: 'approved_memories',
			label: `Relevant memories (${approvedRelevant.length})`,
			charCount: text.length,
			tokenEstimate: sectionTokens(text.length),
			toggleable: false,
			enabled: true,
			detail: approvedRelevant.map((m) => m.content.slice(0, 80)),
		});
	}

	if (input.codexItems && input.codexItems.length > 0) {
		const codex = formatCodexForContext(input.codexItems, {
			documentId: input.documentId,
			projectId: input.projectId,
			relevanceQuery: input.relevanceQuery,
		});

		if (codex.styleCharCount > 0) {
			sections.push({
				id: 'style_entries',
				label: `Style entries (${codex.styleEntries.length})`,
				charCount: codex.styleCharCount,
				tokenEstimate: sectionTokens(codex.styleCharCount),
				toggleable: false,
				enabled: true,
				detail: codex.styleEntries.map((entry) => entry.title || entry.instinct.slice(0, 80)),
			});
		}

		if (codex.referenceCharCount > 0) {
			sections.push({
				id: 'reference_notes',
				label: `Reference notes (${codex.referenceTitles.length})`,
				charCount: codex.referenceCharCount,
				tokenEstimate: sectionTokens(codex.referenceCharCount),
				toggleable: false,
				enabled: true,
				detail: codex.referenceTitles,
			});
		}
	}

	const selection = input.selectionText?.trim();

	if (selection) {
		sections.push({
			id: 'selection',
			label: 'Selection',
			charCount: selection.length,
			tokenEstimate: sectionTokens(selection.length),
			toggleable: false,
			enabled: true,
		});
	}

	if (input.includeScriptContext && input.documentContent) {
		const fullText = toPlainTextScreenplay(input.documentContent);

		if (fullText.length <= MAX_SCRIPT_CHARS) {
			sections.push({
				id: 'full_script',
				label: 'Full script',
				charCount: fullText.length,
				tokenEstimate: sectionTokens(fullText.length),
				toggleable: false,
				enabled: true,
			});
		} else {
			const scriptSections = estimateScriptContextSections(
				input.documentContent,
				input.workspace,
				input.activeBlockIndex ?? null,
				input.scriptContextSections,
			);

			for (const entry of scriptSections) {
				sections.push({
					id: entry.id,
					label: entry.label,
					charCount: entry.charCount,
					tokenEstimate: sectionTokens(entry.charCount),
					toggleable: entry.toggleable,
					enabled: entry.enabled,
				});
			}
		}
	}

	if (input.includeWorkspaceContext) {
		const workspaceText = formatWorkspaceSummary(input.workspace);

		if (workspaceText.trim()) {
			sections.push({
				id: 'workspace_summary',
				label: 'Workspace summary',
				charCount: workspaceText.length,
				tokenEstimate: sectionTokens(workspaceText.length),
				toggleable: true,
				enabled: true,
			});
		}
	}

	const enabledSections = sections.filter((s) => s.enabled);
	const totalCharCount = enabledSections.reduce((sum, s) => sum + s.charCount, 0);
	const totalTokenEstimate = enabledSections.reduce((sum, s) => sum + s.tokenEstimate, 0);

	return {
		sections,
		totalCharCount,
		totalTokenEstimate,
		budgetTokens,
	};
}

/** Compact manifest stored on chat messages — section ids + char counts only. */
export interface StoredContextManifest {
	sections: Array<{ id: ContextManifestSectionId; charCount: number; detail?: string[] }>;
	totalCharCount: number;
	totalTokenEstimate: number;
	budgetTokens: number;
	capturedAt: string;
}

export function toStoredContextManifest(manifest: ContextManifest): StoredContextManifest {
	return {
		sections: manifest.sections
			.filter((s) => s.enabled && s.charCount > 0)
			.map((s) => ({
				id: s.id,
				charCount: s.charCount,
				...(s.detail ? { detail: s.detail } : {}),
			})),
		totalCharCount: manifest.totalCharCount,
		totalTokenEstimate: manifest.totalTokenEstimate,
		budgetTokens: manifest.budgetTokens,
		capturedAt: new Date().toISOString(),
	};
}

export function manifestFromStored(stored: StoredContextManifest): ContextManifest {
	const labelById: Record<ContextManifestSectionId, string> = {
		active_scene: 'Active scene',
		neighboring_scenes: 'Neighboring scenes',
		scene_outline: 'Scene outline',
		rolling_summary: 'Rolling summary',
		other_scene_excerpts: 'Other-scene excerpts',
		script_opening: 'Script opening',
		script_ending: 'Script ending',
		full_script: 'Full script',
		workspace_summary: 'Workspace summary',
		selection: 'Selection',
		pinned_memories: 'Pinned memories',
		approved_memories: 'Relevant memories',
		style_entries: 'Style entries',
		reference_notes: 'Reference notes',
		global_rules: 'Global writer rules',
		document_rules: 'Script writer rules',
		mode_instructions: 'Mode instructions',
		collaborators: 'Collaborators',
	};

	return {
		sections: stored.sections.map((s) => ({
			id: s.id,
			label: labelById[s.id] ?? s.id,
			charCount: s.charCount,
			tokenEstimate: sectionTokens(s.charCount),
			toggleable: false,
			enabled: true,
			detail: s.detail,
		})),
		totalCharCount: stored.totalCharCount,
		totalTokenEstimate: stored.totalTokenEstimate,
		budgetTokens: stored.budgetTokens,
	};
}

export function formatTokenLabel(tokens: number): string {
	if (tokens >= 1000) {
		return `~${(tokens / 1000).toFixed(1).replace(/\.0$/, '')}k`;
	}

	return `~${tokens}`;
}

export function isNearContextBudget(manifest: ContextManifest, threshold = 0.75): boolean {
	return manifest.totalTokenEstimate / manifest.budgetTokens >= threshold;
}
