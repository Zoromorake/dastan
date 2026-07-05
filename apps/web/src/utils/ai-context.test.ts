import { describe, expect, it } from 'vitest';
import { createDefaultWorkspaceData } from '../types';
import { buildAiContext } from './ai-context';
import { createEmptyScreenplayContent } from './screenplay-storage';

function buildMultiSceneContent(sceneCount: number): ReturnType<typeof createEmptyScreenplayContent> {
	const nodes = [];

	for (let index = 0; index < sceneCount; index += 1) {
		nodes.push({
			type: 'scene_heading',
			content: [{ type: 'text', text: `INT. ROOM ${index + 1} - DAY` }],
		});
		nodes.push({
			type: 'action',
			content: [{ type: 'text', text: `Scene body ${index + 1} ${'X'.repeat(1200)}` }],
		});
	}

	return { type: 'doc', content: nodes };
}

describe('buildAiContext', () => {
	it('includes both selection and smart script context when a selection is active', () => {
		const content = buildMultiSceneContent(40);
		const selectionBlockIndex =
			content.content?.findIndex(
				(node) => node.type === 'action' && node.content?.[0]?.text?.startsWith('Scene body 25'),
			) ?? 49;

		const payload = buildAiContext({
			documentId: 'doc-1',
			documentTitle: 'Test Script',
			documentContent: content,
			workspace: createDefaultWorkspaceData(),
			globalRules: '',
			memories: [],
			includeScriptContext: true,
			includeWorkspaceContext: false,
			selectionText: 'Highlighted dialogue line',
			activeBlockIndex: selectionBlockIndex,
		});

		expect(payload.systemPrompt).toContain('Current selection');
		expect(payload.systemPrompt).toContain('Highlighted dialogue line');
		expect(payload.systemPrompt).toContain('Current screenplay');
		expect(payload.systemPrompt).toContain('Active scene (full text, scene 25)');
	});
});
