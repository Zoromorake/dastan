import type { JSONContent } from '@tiptap/core';
import { parseScreenplayTextToContent } from '../utils/screenplay-text';

/** Original short sample (~3 pages) for first-run onboarding — not copyrighted material. */
export function createFirstRunSampleContent(): JSONContent {
	return parseScreenplayTextToContent(
		[
			'FADE IN:',
			'',
			'EXT. ROOFTOP GARDEN - DUSK',
			'',
			'Wind combs through herb boxes. MAYA (30s) waters seedlings with a cracked kettle.',
			'',
			'MAYA',
			'If the city keeps growing, this is all we will have left.',
			'',
			'Her neighbor, JONAH, appears at the stairwell with two paper cups.',
			'',
			'JONAH',
			'Then we defend the garden tonight.',
			'',
			'INT. COMMUNITY HALL - NIGHT',
			'',
			'Folded chairs. A projector hums. Residents argue over a zoning map.',
			'',
			'MAYA',
			'They are not taking our air. Not our light.',
			'',
			'The room splits between applause and groans.',
			'',
			'EXT. CITY STREET - LATER',
			'',
			'Maya and Jonah hang lanterns along the block.',
			'',
			'JONAH',
			'You always turn panic into a plan.',
			'',
			'MAYA',
			'Panic is just energy without direction.',
			'',
			'FADE OUT.',
		].join('\n'),
	);
}
