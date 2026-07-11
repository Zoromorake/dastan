import type { ScreenplayDocumentRecord, ScreenplayProjectRecord, ScreenplayWorkspaceData } from '../types';
import type { AiMemory } from './ai-memory-storage';
import type { CodexItem } from './codex-storage';
import { formatScopedMemories } from './ai-memory-format';
import { formatRelevantApprovedMemories } from './ai-memory-relevance';
import { formatCodexForContext } from './codex-format';
import type { AiInteractionMode } from './ai-interaction-mode';
import { getInteractionModeInstructions } from './ai-interaction-mode';
import { isHubFile, isHubScript } from './hub-item-kind';
import { countWordsFromContent, toPlainTextScreenplay } from './screenplay-text';

export interface GeneralAiContextInput {
	documents: ScreenplayDocumentRecord[];
	projects?: ScreenplayProjectRecord[];
	globalRules: string;
	memories: AiMemory[];
	codexItems?: CodexItem[];
	projectId?: string;
	activeScript?: {
		id: string;
		title: string;
		content: ScreenplayDocumentRecord['content'];
		workspace: ScreenplayDocumentRecord['workspace'];
	};
	includeScriptContext?: boolean;
	interactionMode?: AiInteractionMode;
	relevanceQuery?: string;
}

const MAX_SCRIPTS_LISTED = 40;
const MAX_SYNOPSIS_CHARS = 420;
const MAX_EXCERPT_CHARS_PER_SCRIPT = 1_400;
const MAX_TOTAL_EXCERPT_CHARS = 18_000;

function projectTitleById(projects: ScreenplayProjectRecord[]): Map<string, string> {
	return new Map(projects.map((project) => [project.id, project.title || 'Untitled Project']));
}

function countItemsInProjectTree(
	projectId: string,
	projects: ScreenplayProjectRecord[],
	documents: ScreenplayDocumentRecord[],
): { scripts: number; materials: number; subfolders: number } {
	const childIds = projects.filter((project) => project.parentProjectId === projectId).map((project) => project.id);
	const scopedIds = new Set([projectId, ...childIds]);

	for (const childId of [...childIds]) {
		const nested = projects.filter((project) => project.parentProjectId === childId).map((project) => project.id);
		for (const nestedId of nested) {
			scopedIds.add(nestedId);
		}
	}

	const scripts = documents.filter((document) => isHubScript(document) && document.projectId && scopedIds.has(document.projectId)).length;
	const materials = documents.filter((document) => isHubFile(document) && document.projectId && scopedIds.has(document.projectId)).length;

	return {
		scripts,
		materials,
		subfolders: childIds.length,
	};
}

function clipText(value: string, maxChars: number): string {
	const trimmed = value.trim();

	if (trimmed.length <= maxChars) {
		return trimmed;
	}

	return `${trimmed.slice(0, maxChars - 1).trimEnd()}…`;
}

function developmentGaps(workspace: ScreenplayWorkspaceData | undefined): string[] {
	const basics = workspace?.development?.basics;
	const gaps: string[] = [];

	if (!basics?.logline?.trim()) {
		gaps.push('no logline');
	}

	if (!basics?.synopsis?.trim()) {
		gaps.push('no synopsis');
	}

	if (!basics?.genre?.trim()) {
		gaps.push('no genre');
	}

	const characters = Object.keys(workspace?.characterProfiles ?? {}).length;
	if (characters === 0) {
		gaps.push('no characters yet');
	}

	const beats = workspace?.development?.structureBeats?.length ?? 0;
	if (beats === 0) {
		gaps.push('no structure beats');
	}

	return gaps;
}

function formatScriptCard(
	document: ScreenplayDocumentRecord,
	projectLabel: string,
	excerptBudgetRemaining: number,
): { card: string; excerptCharsUsed: number } {
	const basics = document.workspace?.development?.basics;
	const logline = basics?.logline?.trim() ?? '';
	const synopsis = basics?.synopsis?.trim() ?? '';
	const genre = basics?.genre?.trim() ?? '';
	const wordCount = countWordsFromContent(document.content);
	const plain = toPlainTextScreenplay(document.content).trim();
	const gaps = developmentGaps(document.workspace);
	const stage =
		wordCount === 0
			? 'blank pages'
			: wordCount < 80
				? 'very early draft'
				: wordCount < 400
					? 'early draft'
					: 'in progress';

	const lines = [
		`### "${document.title || 'Untitled'}"`,
		`- Location: ${projectLabel}`,
		genre ? `- Genre: ${genre}` : null,
		`- Stage: ${stage}`,
		logline ? `- Logline: ${logline}` : null,
		synopsis ? `- Synopsis: ${clipText(synopsis, MAX_SYNOPSIS_CHARS)}` : null,
		gaps.length > 0 ? `- Still missing: ${gaps.join(', ')}` : null,
	].filter(Boolean);

	let excerptCharsUsed = 0;

	if (plain && excerptBudgetRemaining > 120) {
		const excerptLimit = Math.min(MAX_EXCERPT_CHARS_PER_SCRIPT, excerptBudgetRemaining);
		const excerpt = clipText(plain, excerptLimit);
		excerptCharsUsed = excerpt.length;
		lines.push(`- Opening excerpt:\n${excerpt}`);
	} else if (!plain) {
		lines.push('- Pages: empty — no scene text yet');
	}

	return { card: lines.join('\n'), excerptCharsUsed };
}

export function buildGeneralAiContext(input: GeneralAiContextInput): { systemPrompt: string } {
	const projects = input.projects ?? [];
	const rootProjects = projects.filter((project) => !project.parentProjectId);
	const subfolders = projects.filter((project) => Boolean(project.parentProjectId));
	const scripts = input.documents.filter(isHubScript);
	const materials = input.documents.filter(isHubFile);
	const titlesByProjectId = projectTitleById(projects);
	const projectCount = rootProjects.length;
	const scriptCount = scripts.length;
	const materialCount = materials.length;

	const sections: string[] = [
		'You are a screenplay writing assistant for Dastan, a professional script editor.',
		'The writer is in their library — help with brainstorming, format questions, story structure, and planning across their projects.',
		[
			'Library taxonomy (never conflate these counts):',
			'- Projects = top-level folders the writer created in Organize. This is the only number to use for "how many projects".',
			'- Subfolders = nested folders inside a project. Do not count subfolders as projects.',
			'- Scripts = screenplay documents on the slate. Never report script count as project count.',
			'- Materials/files = non-script attachments (PDFs, images, notes, etc.).',
			`When asked for counts, answer exactly from this line: projects=${projectCount}, scripts=${scriptCount}, materials=${materialCount}.`,
			'If earlier messages in this chat claimed different library counts, ignore those claims. The Library summary below is live ground truth and always wins over prior assistant answers.',
			'When asked what scripts are about: use each script\'s title, logline, synopsis, and opening excerpt. Lead with story/substance, not word counts. If a script is thin, say it is early and name what is still missing (logline, synopsis, pages, characters, structure).',
			'You DO have access to the script cards and excerpts below — never claim you cannot access script content when those sections are present.',
		].join('\n'),
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

	const relevantApproved = formatRelevantApprovedMemories(input.memories, {
		projectId: input.projectId,
		documentId: input.activeScript?.id,
		relevanceQuery: input.relevanceQuery,
	});

	if (relevantApproved) {
		sections.push(`Relevant approved memories:\n${relevantApproved}`);
	}

	if (input.codexItems && input.codexItems.length > 0) {
		const codex = formatCodexForContext(input.codexItems, {
			documentId: input.activeScript?.id,
			projectId: input.projectId,
			relevanceQuery: input.relevanceQuery,
		});

		if (codex.styleSection) {
			sections.push(codex.styleSection);
		}

		if (codex.referenceSection) {
			sections.push(codex.referenceSection);
		}
	}

	sections.push(
		[
			'Library summary (ground truth — use these numbers):',
			`- Projects: ${projectCount}`,
			`- Scripts: ${scriptCount}`,
			`- Materials/files: ${materialCount}`,
			subfolders.length > 0 ? `- Subfolders (not projects): ${subfolders.length}` : null,
			projectCount > 0 && scriptCount === 0
				? '- Note: projects exist, but no screenplays have been created yet. That is normal.'
				: null,
		]
			.filter(Boolean)
			.join('\n'),
	);

	if (projectCount > 0) {
		const projectLines = rootProjects
			.slice(0, 40)
			.map((project) => {
				const tree = countItemsInProjectTree(project.id, projects, input.documents);
				const details = [
					project.genre?.trim(),
					project.logline?.trim(),
					`${tree.scripts} script${tree.scripts === 1 ? '' : 's'}`,
					`${tree.materials} material${tree.materials === 1 ? '' : 's'}`,
					tree.subfolders > 0 ? `${tree.subfolders} subfolder${tree.subfolders === 1 ? '' : 's'}` : null,
				]
					.filter(Boolean)
					.join(' · ');
				return `- "${project.title || 'Untitled Project'}"${details ? `: ${details}` : ''}`;
			})
			.join('\n');

		sections.push(`Projects (${projectCount}):\n${projectLines}`);
	} else {
		sections.push('Projects (0): none yet.');
	}

	if (subfolders.length > 0) {
		const subfolderLines = subfolders
			.slice(0, 40)
			.map((folder) => {
				const parentTitle = folder.parentProjectId
					? titlesByProjectId.get(folder.parentProjectId) ?? 'Unknown project'
					: 'Library root';
				return `- "${folder.title || 'Untitled Folder'}" · inside "${parentTitle}"`;
			})
			.join('\n');
		sections.push(`Subfolders (${subfolders.length}, not counted as projects):\n${subfolderLines}`);
	}

	if (scriptCount > 0) {
		let excerptBudgetRemaining = MAX_TOTAL_EXCERPT_CHARS;
		const scriptCards = scripts.slice(0, MAX_SCRIPTS_LISTED).map((document) => {
			const projectLabel = document.projectId
				? titlesByProjectId.get(document.projectId) ?? 'Unknown project'
				: 'Library root (not inside a project)';
			const { card, excerptCharsUsed } = formatScriptCard(document, projectLabel, excerptBudgetRemaining);
			excerptBudgetRemaining = Math.max(0, excerptBudgetRemaining - excerptCharsUsed);
			return card;
		});

		sections.push(
			`Scripts (${scriptCount}) — story cards with available development notes and opening excerpts:\n\n${scriptCards.join('\n\n')}`,
		);
	} else {
		sections.push('Scripts (0): none yet.');
	}

	if (materialCount > 0) {
		const materialLines = materials
			.slice(0, 40)
			.map((document) => {
				const projectLabel = document.projectId
					? titlesByProjectId.get(document.projectId) ?? 'Unknown project'
					: 'Library root';
				const fileName = document.hubFile?.fileName?.trim() || document.title || 'Untitled file';
				return `- "${fileName}" · ${projectLabel}`;
			})
			.join('\n');

		sections.push(`Materials/files (${materialCount}):\n${materialLines}`);
	}

	if (projectCount === 0 && scriptCount === 0 && materialCount === 0) {
		sections.push('The library is empty — the writer has not created any projects, scripts, or materials yet.');
	}

	if (input.activeScript && input.includeScriptContext) {
		const scriptText = toPlainTextScreenplay(input.activeScript.content).slice(0, 24_000);
		sections.push(`Active script "${input.activeScript.title}":\n${scriptText}`);
	}

	return { systemPrompt: sections.join('\n\n') };
}
