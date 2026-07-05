import { describe, expect, it } from 'vitest';
import { createDefaultWorkspaceData } from '../types';
import { buildSmartScriptContext } from './ai-context-script';
import { createEmptyScreenplayContent } from './screenplay-storage';

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

		expect(text).toContain('Scene outline');
		expect(text).toContain('Script opening');
		expect(text).toContain('Script ending');
		expect(text).toContain('A test logline');
	});
});
