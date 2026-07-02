import type { ScreenplayDocumentRecord } from '../types';
import type { AiMemory } from './ai-memory-storage';
import { formatScopedMemories } from './ai-memory-format';
import type { AiInteractionMode } from './ai-interaction-mode';
import { getInteractionModeInstructions } from './ai-interaction-mode';
import { countWordsFromContent, toPlainTextScreenplay } from './screenplay-text';

export interface GeneralAiContextInput {
	documents: ScreenplayDocumentRecord[];
	globalRules: string;
	memories: AiMemory[];
	projectId?: string;
	activeScript?: {
		id: string;
		title: string;
		content: ScreenplayDocumentRecord['content'];
		workspace: ScreenplayDocumentRecord['workspace'];
	};
	includeScriptContext?: boolean;
	interactionMode?: AiInteractionMode;
}

export function buildGeneralAiContext(input: GeneralAiContextInput): { systemPrompt: string } {
	const sections: string[] = [
		'You are a screenplay writing assistant for Dastan, a professional script editor.',
		'The writer is in their library — help with brainstorming, format questions, story structure, and planning across their projects.',
		getInteractionModeInstructions(input.interactionMode ?? 'ask'),
	];

	if (input.globalRules.trim()) {
		sections.push(`Writer rules:\n${input.globalRules.trim()}`);
	}

	const memoryOptions = {
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

	if (input.documents.length > 0) {
		const libraryLines = input.documents
			.slice(0, 40)
			.map((document) => {
				const wordCount = countWordsFromContent(document.content);
				const logline = document.workspace?.development?.basics?.logline?.trim();
				const genre = document.workspace?.development?.basics?.genre?.trim();
				const details = [genre, logline, `${wordCount} words`].filter(Boolean).join(' · ');
				return `- "${document.title || 'Untitled'}"${details ? `: ${details}` : ''}`;
			})
			.join('\n');

		sections.push(`Library overview (${input.documents.length} script${input.documents.length === 1 ? '' : 's'}):\n${libraryLines}`);
	} else {
		sections.push('The library is empty — the writer has not created any scripts yet.');
	}

	if (input.activeScript && input.includeScriptContext) {
		const scriptText = toPlainTextScreenplay(input.activeScript.content).slice(0, 24_000);
		sections.push(`Active script "${input.activeScript.title}":\n${scriptText}`);
	}

	return { systemPrompt: sections.join('\n\n') };
}
