import { describe, expect, it } from 'vitest';
import { createStructureBeatsFromTemplate, mergeStructureBeatsWithTemplate } from './story-structure';

describe('story-structure', () => {
	it('creates 15 Save the Cat beats', () => {
		const beats = createStructureBeatsFromTemplate('save-the-cat');
		expect(beats).toHaveLength(15);
		expect(beats[0]?.label).toBe('Opening Image');
	});

	it('preserves summaries when switching templates', () => {
		const beats = createStructureBeatsFromTemplate('three-act');
		const first = beats[0];
		if (!first) {
			throw new Error('expected beat');
		}

		const merged = mergeStructureBeatsWithTemplate(
			[{ ...first, summary: 'Hero intro' }],
			'three-act',
		);

		expect(merged[0]?.summary).toBe('Hero intro');
	});
});
