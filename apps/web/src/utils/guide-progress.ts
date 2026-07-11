import type { ScreenplayWorkspaceData } from '../types';
import { GUIDE_STEPS, type GuideStepId } from '../content/guide-copy';

function hasText(value: string | undefined | null): boolean {
	return typeof value === 'string' && value.trim().length > 0;
}

export function isGuideStepComplete(step: GuideStepId, workspace: ScreenplayWorkspaceData | undefined): boolean {
	const basics = workspace?.development?.basics;

	switch (step) {
		case 'spark':
			return hasText(basics?.spark);
		case 'logline':
			return hasText(basics?.logline);
		case 'genre':
			return hasText(basics?.genre) || hasText(basics?.tone);
		case 'characters':
			return Object.values(workspace?.characterProfiles ?? {}).some((profile) => hasText(profile.name));
		case 'beats':
			return (workspace?.development?.structureBeats ?? []).some((beat) => hasText(beat.summary));
		case 'scenes':
			return (basics?.actSummaries ?? []).some((summary) => hasText(summary));
		case 'finish':
			return true;
		default:
			return false;
	}
}

export function getFirstIncompleteGuideStep(workspace: ScreenplayWorkspaceData | undefined): GuideStepId {
	for (const step of GUIDE_STEPS) {
		if (step === 'finish') {
			return 'finish';
		}

		if (!isGuideStepComplete(step, workspace)) {
			return step;
		}
	}

	return 'finish';
}

export function getGuideProgressIndex(workspace: ScreenplayWorkspaceData | undefined): number {
	const step = getFirstIncompleteGuideStep(workspace);
	return GUIDE_STEPS.indexOf(step);
}
