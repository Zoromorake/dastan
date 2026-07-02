import type { ScriptTemplate } from './user-settings';

export const SCRIPT_TEMPLATE_DESCRIPTIONS: Record<ScriptTemplate, string> = {
	feature: 'Full-length screenplay with a sample opening scene you can replace.',
	short: 'Short-film format with a compact starter scene in one location.',
	tv_pilot: 'Pilot layout with cold open, teaser, and act-break markers.',
	tv_episode: 'Episodic TV format with teaser and sample cold open.',
	stage_play: 'Theatrical script with act break and stage-direction samples.',
	documentary: 'Doc format with title card, narration, and interview beats.',
};

export const SCRIPT_TEMPLATE_PREFILLED = true;

/** Default story-structure template to pair with each script template. */
export const SCRIPT_TEMPLATE_STRUCTURE: Record<ScriptTemplate, 'save-the-cat' | 'three-act' | 'blank'> = {
	feature: 'save-the-cat',
	short: 'three-act',
	tv_pilot: 'three-act',
	tv_episode: 'three-act',
	stage_play: 'three-act',
	documentary: 'blank',
};
