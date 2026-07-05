import type { JSONContent } from '@tiptap/core';
import type { ScreenplayWorkspaceData } from '../types';
import type { AiMemory } from './ai-memory-storage';
import type { CollaboratorPresence } from '@dastan/plugin-api';
import { formatScopedMemories } from './ai-memory-format';
import type { AiInteractionMode } from './ai-interaction-mode';
import { getInteractionModeInstructions } from './ai-interaction-mode';
import { toPlainTextScreenplay } from './screenplay-text';
import { buildSmartScriptContext, MAX_SCRIPT_CHARS } from './ai-context-script';

export { MAX_SCRIPT_CHARS };

export interface AiContextInput {
	documentId: string;
	documentTitle: string;
	documentContent: JSONContent | null;
	workspace: ScreenplayWorkspaceData;
	globalRules: string;
	memories: AiMemory[];
	projectId?: string;
	includeScriptContext: boolean;
	includeWorkspaceContext: boolean;
	selectionText?: string | null;
	interactionMode?: AiInteractionMode;
	activeWorkspaceTab?: string | null;
	activeCollaborators?: CollaboratorPresence[];
}

export interface AiContextPayload {
	systemPrompt: string;
}

function truncateText(text: string, maxChars: number): string {
	if (text.length <= maxChars) {
		return text;
	}

	return `${text.slice(0, maxChars)}\n\n[Context trimmed for token budget]`;
}

export function formatWorkspaceSummary(workspace: ScreenplayWorkspaceData): string {
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

	const { basics, structureBeats, treatment } = workspace.development;

	if (basics.logline.trim()) {
		sections.push(`Logline:\n${basics.logline.trim()}`);
	}

	if (basics.synopsis.trim()) {
		sections.push(`Synopsis:\n${basics.synopsis.trim()}`);
	}

	const actSummary = basics.actSummaries.map((act, index) => act.trim()).filter(Boolean);
	if (actSummary.length > 0) {
		sections.push(`Act summaries:\n${actSummary.map((act, index) => `Act ${index + 1}: ${act}`).join('\n')}`);
	}

	if (structureBeats.length > 0) {
		const structureLines = [...structureBeats]
			.sort((left, right) => left.order - right.order)
			.slice(0, 16)
			.map((beat) => {
				const sceneNote =
					typeof beat.linkedSceneIndex === 'number' ? ` [scene @ block ${beat.linkedSceneIndex}]` : '';
				return `${beat.label}: ${beat.summary || '(empty)'}${sceneNote}`;
			})
			.join('\n');

		sections.push(`Story structure:\n${structureLines}`);
	}

	if (treatment.trim()) {
		sections.push(`Treatment:\n${treatment.trim().slice(0, 2000)}`);
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

export function getScriptCharCount(documentContent: JSONContent | null): number {
	if (!documentContent) {
		return 0;
	}

	return toPlainTextScreenplay(documentContent).length;
}

export function buildAiContext(input: AiContextInput): AiContextPayload {
	const sections: string[] = [
		'You are a screenplay writing assistant for Dastan, a professional script editor.',
		'Help the writer with structure, dialogue, pacing, character arcs, and industry-standard formatting.',
		getInteractionModeInstructions(input.interactionMode ?? 'planner'),
	];

	if (input.globalRules.trim()) {
		sections.push(`Writer rules:\n${input.globalRules.trim()}`);
	}

	const memoryOptions = {
		documentId: input.documentId,
		projectId: input.projectId,
		pinnedOnly: true,
	};

	const globalMemories = formatScopedMemories(input.memories, 'global', memoryOptions);

	if (globalMemories) {
		sections.push(`Pinned global memories:\n${globalMemories}`);
	}

	const projectMemories = formatScopedMemories(input.memories, 'project', memoryOptions);

	if (projectMemories) {
		sections.push(`Project memories:\n${projectMemories}`);
	}

	const documentMemories = formatScopedMemories(input.memories, 'document', memoryOptions);

	if (documentMemories) {
		sections.push(`Pinned script memories:\n${documentMemories}`);
	}

	sections.push(`Current script title: "${input.documentTitle}"`);

	if (input.activeWorkspaceTab) {
		sections.push(`Active workspace view: ${input.activeWorkspaceTab}`);
	}

	const selection = input.selectionText?.trim();

	if (selection) {
		sections.push(`Current selection (user highlighted this text):\n${selection.slice(0, 4000)}`);
	}

	if (input.includeScriptContext && !selection && input.documentContent) {
		const scriptText = buildSmartScriptContext(input.documentContent, input.workspace, MAX_SCRIPT_CHARS);

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

	const collaborators = input.activeCollaborators?.filter((peer) => peer.name.trim().length > 0) ?? [];

	if (collaborators.length > 0) {
		const collaboratorLines = collaborators
			.map((peer) => {
				const cursor =
					typeof peer.cursorBlockIndex === 'number'
						? ` (editing near block ${peer.cursorBlockIndex + 1})`
						: '';
				return `- ${peer.name}${cursor}`;
			})
			.join('\n');

		sections.push(`Active collaborators in this writing room:\n${collaboratorLines}`);
	}

	return {
		systemPrompt: sections.join('\n\n'),
	};
}
