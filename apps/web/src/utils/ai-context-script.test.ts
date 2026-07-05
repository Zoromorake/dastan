import { describe, expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { createDefaultWorkspaceData } from '../types';
import { buildSmartScriptContext, getSceneIndexForBlockIndex } from './ai-context-script';
import { createEmptyScreenplayContent } from './screenplay-storage';

function buildMultiSceneContent(sceneCount: number, sceneMarker: (index: number) => string): JSONContent {
	const nodes: JSONContent[] = [];

	for (let index = 0; index < sceneCount; index += 1) {
		nodes.push({
			type: 'scene_heading',
			content: [{ type: 'text', text: `INT. LOCATION ${index + 1} - DAY` }],
		});
		nodes.push({
			type: 'action',
			content: [{ type: 'text', text: sceneMarker(index) }],
		});
	}

	return { type: 'doc', content: nodes };
}

describe('buildSmartScriptContext', () => {
	it('returns full text for short scripts', () => {
		const content = createEmptyScreenplayContent();
		const text = buildSmartScriptContext(content, createDefaultWorkspaceData());

		expect(text).toContain('FADE IN');
	});

	it('uses outline plus excerpts for long scripts', () => {
		const longLine = 'A'.repeat(500);
		const lines = Array.from({ length: 80 }, () => longLine).join('\n');
		const content = {
			type: 'doc',
			content: [
				{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. ROOM - DAY' }] },
				{ type: 'action', content: [{ type: 'text', text: lines }] },
			],
		};

		const workspace = createDefaultWorkspaceData();
		workspace.development.basics.logline = 'A test logline';

		const text = buildSmartScriptContext(content, workspace, 10_000);

		expect(text).toContain('prioritizing scene 1');
		expect(text.length).toBeLessThanOrEqual(10_000 + 50);
	});

	it('includes the active scene in full when cursor is deep in the script', () => {
		const activeMarker = `ACTIVE_SCENE_UNIQUE_MARKER_${'Z'.repeat(1200)}`;
		const content = buildMultiSceneContent(80, (index) =>
			index === 59 ? activeMarker : `Filler scene ${index + 1} ${'B'.repeat(400)}`,
		);
		const activeBlockIndex = content.content?.findIndex(
			(node) => node.type === 'action' && node.content?.[0]?.text === activeMarker,
		);

		expect(activeBlockIndex).toBeGreaterThan(0);
		expect(getSceneIndexForBlockIndex(content, activeBlockIndex ?? 0)).toBe(59);

		const text = buildSmartScriptContext(
			content,
			createDefaultWorkspaceData(),
			12_000,
			activeBlockIndex,
		);

		expect(text).toContain('ACTIVE_SCENE_UNIQUE_MARKER');
		expect(text).toContain('Active scene (full text, scene 60)');
	});

	it('changes context when the cursor moves to a different scene', () => {
		const firstMarker = `FIRST_SCENE_MARKER_${'F'.repeat(1200)}`;
		const lastMarker = `LAST_SCENE_MARKER_${'L'.repeat(1200)}`;
		const content = buildMultiSceneContent(80, (index) => {
			if (index === 0) {
				return firstMarker;
			}

			if (index === 79) {
				return lastMarker;
			}

			return `Middle scene ${index + 1} ${'M'.repeat(400)}`;
		});

		const firstBlockIndex = content.content?.findIndex(
			(node) => node.type === 'action' && node.content?.[0]?.text === firstMarker,
		);
		const lastBlockIndex = content.content?.findIndex(
			(node) => node.type === 'action' && node.content?.[0]?.text === lastMarker,
		);

		const firstContext = buildSmartScriptContext(
			content,
			createDefaultWorkspaceData(),
			12_000,
			firstBlockIndex,
		);
		const lastContext = buildSmartScriptContext(
			content,
			createDefaultWorkspaceData(),
			12_000,
			lastBlockIndex,
		);

		expect(firstContext).toContain('FIRST_SCENE_MARKER');
		expect(firstContext).toContain('Active scene (full text, scene 1)');
		expect(lastContext).toContain('LAST_SCENE_MARKER');
		expect(lastContext).toContain('Active scene (full text, scene 80)');
		expect(firstContext).not.toEqual(lastContext);
	});
});
