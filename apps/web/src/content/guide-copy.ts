export const GUIDE_STEPS = ['spark', 'logline', 'genre', 'characters', 'beats', 'scenes', 'finish'] as const;

export type GuideStepId = (typeof GUIDE_STEPS)[number];

export const GUIDE_STEP_LABELS: Record<GuideStepId, string> = {
	spark: 'Spark',
	logline: 'Logline',
	genre: 'Genre & tone',
	characters: 'Core characters',
	beats: 'Beat sheet',
	scenes: 'Scene sketch',
	finish: 'Ready to write',
};

export const GUIDE_STEP_COPY: Record<GuideStepId, { title: string; guidance: string }> = {
	spark: {
		title: 'What is this story, in one breath?',
		guidance:
			'Start with the smallest true thing you know. Not a pitch — a pulse. One sentence that names who we follow and what feels different about this idea. You can be messy; you are only capturing heat.',
	},
	logline: {
		title: 'Shape the spine',
		guidance:
			'A logline is a promise to the reader: someone wants something, something stands in the way, and the cost of failure matters. Fill each field plainly — we will stitch them into one sentence you can rewrite later.',
	},
	genre: {
		title: 'Genre, tone, and comps',
		guidance:
			'Genre sets audience expectation; tone sets how the story should feel on the page. Comparable films are shorthand for your collaborators — pick up to three titles that share a mood or engine, not a plot you are copying.',
	},
	characters: {
		title: 'Who carries the story?',
		guidance:
			'Name one to four characters you already see. Want is what they chase on the surface; need is what they must learn; flaw is the habit that makes the chase costly. You do not need full bios — just enough to write toward.',
	},
	beats: {
		title: 'Map the pressure',
		guidance:
			'Beats are checkpoints, not prose. Each beat is a turn: something changes, escalates, or breaks. Summarize in your own words; link to scenes later when the script exists.',
	},
	scenes: {
		title: 'Sketch the sequence (optional)',
		guidance:
			'Rough scene lists per act help you see gaps before you draft. Bullet moments, not full outlines. Skip this if you would rather discover scenes on the page.',
	},
	finish: {
		title: 'You are ready',
		guidance:
			'Your development room notes are saved in the workspace. When you continue, you will land on a clean first page — FADE IN — with everything you built still one panel away.',
	},
};

export const LOGLINE_FIELD_COPY = {
	protagonist: 'Who we follow — specific enough to picture.',
	want: 'The visible goal driving the first movement of the story.',
	obstacle: 'What makes that goal difficult or costly.',
	stakes: 'What they stand to lose if they fail.',
} as const;

export const SAVE_THE_CAT_BEAT_GUIDANCE: Record<string, string> = {
	'opening-image': 'Show the world and tone before the story tilts. A snapshot of normal — or the lie your hero lives in.',
	'theme-stated': 'Hint at the question the story will argue. Often spoken by someone who is not the hero.',
	setup: 'Introduce the hero, their world, and what is missing. We should understand what life costs them today.',
	catalyst: 'The event that makes the old life impossible. Small or huge — but irreversible.',
	debate: 'Resistance. The hero questions the journey, bargains, or tries to fix things the old way.',
	'break-into-two': 'The choice to enter the new world. Act I ends when they cannot go back unchanged.',
	'b-story': 'A relationship or secondary thread that carries the theme — often where the hero learns what they need.',
	'fun-and-games': 'The promise of the premise on display. What the poster would show.',
	midpoint: 'A false victory or false defeat. Stakes rise; the clock starts ticking louder.',
	'bad-guys-close-in': 'External pressure and internal doubt compound. Plans fail; allies fracture.',
	'all-is-lost': 'The lowest point. What the hero feared is real — or worse.',
	'dark-night': 'Stillness after the fall. The hero faces the truth they have been avoiding.',
	'break-into-three': 'Insight meets action. A new plan born from what they learned.',
	finale: 'Execute the plan. Confront the central problem with everything on the line.',
	'final-image': 'Mirror the opening image. Show how the world — or the hero — has changed.',
};

export const THREE_ACT_BEAT_GUIDANCE: Record<string, string> = {
	'act-one-setup': 'Establish ordinary world, tone, and the hero’s gap between want and need.',
	'inciting-incident': 'Disrupt equilibrium. Something arrives that cannot be ignored.',
	'act-one-break': 'Hero commits to the path. Cross a threshold into Act II.',
	'act-two-confrontation': 'Escalating trials that test the hero’s plan and beliefs.',
	midpoint: 'Major reversal. The story reveals a sharper truth about the conflict.',
	'act-two-low': 'All-is-lost beat. The hero’s approach collapses.',
	'act-three-resolution': 'Final push. Resources are thin; choices are irreversible.',
	climax: 'Central conflict resolves. The hero acts on what they have become.',
};

export const GUIDE_ROOM_SYSTEM_PROMPT =
	'You are a development room facilitator. Respond ONLY with 2–3 short probing questions about the current development step. Never provide answers, loglines, beats, or filled-in story material.';
