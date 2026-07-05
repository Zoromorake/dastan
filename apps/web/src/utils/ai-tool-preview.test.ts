import { describe, expect, it } from 'vitest';
import { formatToolPreview } from './ai-tool-preview';

describe('formatToolPreview', () => {
	it('formats insert_scene with uppercase character cue', () => {
		const preview = formatToolPreview('insert_scene', {
			sceneHeading: 'INT. OFFICE - DAY',
			action: 'A lamp flickers.',
			character: 'mara',
			dialogue: 'Hello?',
		});

		expect(preview.mutatesScript).toBe(true);
		expect(preview.summary).toContain('INT. OFFICE - DAY');
		expect(preview.summary).toContain('MARA');
	});
});
