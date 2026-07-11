import { describe, expect, it } from 'vitest';
import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../types';
import { createDefaultWorkspaceData } from '../types';
import { buildGeneralAiContext } from './ai-context-general';

function makeProject(id: string, title: string, parentProjectId: string | null = null): ScreenplayProjectRecord {
	return {
		id,
		title,
		parentProjectId,
		updatedAt: new Date().toISOString(),
	};
}

function makeScript(
	id: string,
	title: string,
	projectId?: string,
	options?: { logline?: string; synopsis?: string; sceneText?: string },
): ScreenplayDocumentRecord {
	const workspace = createDefaultWorkspaceData();

	if (options?.logline) {
		workspace.development.basics.logline = options.logline;
	}

	if (options?.synopsis) {
		workspace.development.basics.synopsis = options.synopsis;
	}

	return {
		id,
		title,
		projectId,
		updatedAt: new Date().toISOString(),
		content: options?.sceneText
			? {
					type: 'doc',
					content: [
						{
							type: 'action',
							content: [{ type: 'text', text: options.sceneText }],
						},
					],
				}
			: { type: 'doc', content: [] },
		workspace,
		hubKind: 'script',
	};
}

describe('buildGeneralAiContext library counts', () => {
	it('counts root projects separately from scripts and subfolders', () => {
		const { systemPrompt } = buildGeneralAiContext({
			documents: [
				makeScript('s1', 'Script One', 'p1'),
				makeScript('s2', 'Script Two', 'p1'),
				makeScript('s3', 'Script Three'),
			],
			projects: [
				makeProject('p1', 'Project Alpha'),
				makeProject('p2', 'Project Beta'),
				makeProject('p3', 'Research', 'p1'),
			],
			globalRules: '',
			memories: [],
		});

		expect(systemPrompt).toContain('projects=2, scripts=3, materials=0');
		expect(systemPrompt).toContain('- Projects: 2');
		expect(systemPrompt).toContain('- Scripts: 3');
		expect(systemPrompt).toContain('- Subfolders (not projects): 1');
		expect(systemPrompt).toContain('Projects (2):');
		expect(systemPrompt).toContain('Scripts (3)');
		expect(systemPrompt).not.toContain('Projects (3');
	});

	it('includes story substance instead of leading with word counts', () => {
		const { systemPrompt } = buildGeneralAiContext({
			documents: [
				makeScript('s1', 'Night Market', 'p1', {
					logline: 'A chef hunts a stolen family recipe across one endless night.',
					synopsis: 'When her restaurant burns, Maya follows a trail of spice and rumor.',
					sceneText: 'INT. MARKET - NIGHT\n\nMaya pushes through the crowd.',
				}),
			],
			projects: [makeProject('p1', 'Untitled Project')],
			globalRules: '',
			memories: [],
		});

		expect(systemPrompt).toContain('Logline: A chef hunts a stolen family recipe');
		expect(systemPrompt).toContain('Synopsis: When her restaurant burns');
		expect(systemPrompt).toContain('Opening excerpt:');
		expect(systemPrompt).toContain('Maya pushes through the crowd');
		expect(systemPrompt).toContain('never claim you cannot access script content');
		expect(systemPrompt).not.toMatch(/\d+ words/);
	});
});
