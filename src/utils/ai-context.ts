import type { JSONContent } from '@tiptap/core';
import type { ScreenplayWorkspaceData } from '../types';
import type { AiMemory } from './ai-memory-storage';
import { toPlainTextScreenplay } from './screenplay-text';

const MAX_SCRIPT_CHARS = 24_000;

export interface AiContextInput {
	documentTitle: string;
	documentContent: JSONContent | null;
	workspace: ScreenplayWorkspaceData;
	globalRules: string;
	memories: AiMemory[];
	includeScriptContext: boolean;
	includeWorkspaceContext: boolean;
}

export interface AiContextPayload {
	systemPrompt: string;
}

function truncateText(text: string, maxChars: number): string {
	if (text.length <= maxChars) {
		return text;
	}

	return `${text.slice(0, maxChars)}\n\n[Script truncated for context window]`;
}

function formatMemories(memories: AiMemory[], scope: AiMemory['scope'], documentId?: string): string {
	const scoped = memories.filter((memory) => {
		if (memory.scope !== scope) {
			return false;
		}

		if (scope === 'document') {
			return memory.documentId === documentId;
		}

		return true;
	});

	if (scoped.length === 0) {
		return '';
	}

	return scoped.map((memory) => `- ${memory.content}`).join('\n');
}

function formatWorkspaceSummary(workspace: ScreenplayWorkspaceData): string {
	const sections: string[] = [];

	if (workspace.globalNotes.trim()) {
		sections.push(`Global notes:\n${workspace.globalNotes.trim()}`);
	}

	const characters = Object.values(workspace.characterProfiles);

	if (characters.length > 0) {
		const characterLines = characters
			.slice(0, 12)
			.map((profile) => {
				const details = [profile.age, profile.arc, profile.notes].filter(Boolean).join(' | ');
				return details ? `${profile.name}: ${details}` : profile.name;
			})
			.join('\n');

		sections.push(`Characters:\n${characterLines}`);
	}

	const locations = Object.values(workspace.locationProfiles);

	if (locations.length > 0) {
		const locationLines = locations
			.slice(0, 8)
			.map((profile) => {
				const details = [profile.description, profile.notes].filter(Boolean).join(' | ');
				return details ? `${profile.location}: ${details}` : profile.location;
			})
			.join('\n');

		sections.push(`Locations:\n${locationLines}`);
	}

	if (workspace.beatBoard.length > 0) {
		const beatLines = workspace.beatBoard
			.slice(0, 16)
			.sort((left, right) => left.order - right.order)
			.map((beat) => `${beat.heading}: ${beat.beat}`)
			.join('\n');

		sections.push(`Beat board:\n${beatLines}`);
	}

	return sections.join('\n\n');
}

export function buildAiContext(input: AiContextInput): AiContextPayload {
	const sections: string[] = [
		'You are a screenplay writing assistant for Dastan, a professional script editor.',
		'Help the writer with structure, dialogue, pacing, character arcs, and industry-standard formatting.',
		'Be concise and actionable. When suggesting rewrites, preserve the writer\'s voice.',
	];

	if (input.globalRules.trim()) {
		sections.push(`Writer rules:\n${input.globalRules.trim()}`);
	}

	const globalMemories = formatMemories(input.memories, 'global');

	if (globalMemories) {
		sections.push(`Pinned global memories:\n${globalMemories}`);
	}

	const documentMemories = formatMemories(input.memories, 'document');

	if (documentMemories) {
		sections.push(`Pinned script memories:\n${documentMemories}`);
	}

	sections.push(`Current script title: "${input.documentTitle}"`);

	if (input.includeScriptContext && input.documentContent) {
		const scriptText = truncateText(toPlainTextScreenplay(input.documentContent), MAX_SCRIPT_CHARS);

		if (scriptText.trim()) {
			sections.push(`Current screenplay:\n${scriptText}`);
		}
	}

	if (input.includeWorkspaceContext) {
		const workspaceSummary = formatWorkspaceSummary(input.workspace);

		if (workspaceSummary.trim()) {
			sections.push(`Workspace context:\n${workspaceSummary}`);
		}
	}

	return {
		systemPrompt: sections.join('\n\n'),
	};
}
