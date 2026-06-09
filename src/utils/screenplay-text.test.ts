import { describe, expect, it } from 'vitest';
import { getScreenplayBlocksFromContent, toFountainScreenplay, toFinalDraftScreenplay } from './screenplay-text';

const sampleContent = {
	type: 'doc',
	content: [
		{ type: 'scene_heading', content: [{ type: 'text', text: 'INT. OFFICE - DAY' }] },
		{ type: 'action', content: [{ type: 'text', text: 'A phone rings.' }] },
		{ type: 'character', content: [{ type: 'text', text: 'MARA' }] },
		{ type: 'dialogue', content: [{ type: 'text', text: 'Hello?' }] },
		{ type: 'transition', content: [{ type: 'text', text: 'CUT TO:' }] },
	],
};

describe('screenplay-text exports', () => {
	it('extracts screenplay blocks from content', () => {
		const blocks = getScreenplayBlocksFromContent(sampleContent);
		expect(blocks).toHaveLength(5);
		expect(blocks[0]?.type).toBe('scene_heading');
		expect(blocks[3]?.text).toBe('Hello?');
	});

	it('exports fountain format with uppercase slugline', () => {
		const fountain = toFountainScreenplay(sampleContent);
		expect(fountain).toContain('INT. OFFICE - DAY');
		expect(fountain).toContain('MARA');
	});

	it('exports fdx xml with title page', () => {
		const fdx = toFinalDraftScreenplay(sampleContent, 'Test Script');
		expect(fdx).toContain('<FinalDraft');
		expect(fdx).toContain('Type="Scene Heading"');
		expect(fdx).toContain('<TitlePage>');
		expect(fdx).toContain('Test Script');
	});
});
