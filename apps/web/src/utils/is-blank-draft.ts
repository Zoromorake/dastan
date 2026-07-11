import type { ScreenplayDocumentRecord, ScreenplayWorkspaceData } from '../types';
import { isDefaultScratchContent, UNTITLED_SCREENPLAY_TITLE } from './scratch-template';

const SWEEP_AGE_MS = 48 * 60 * 60 * 1000;

function hasText(value: string | undefined | null): boolean {
	return typeof value === 'string' && value.trim().length > 0;
}

export function isBlankWorkspace(workspace: ScreenplayWorkspaceData | undefined): boolean {
	if (!workspace) {
		return true;
	}

	const basics = workspace.development?.basics;

	if (
		hasText(basics?.logline) ||
		hasText(basics?.synopsis) ||
		hasText(basics?.genre) ||
		hasText(basics?.spark) ||
		hasText(basics?.tone) ||
		(basics?.comparableFilms ?? []).some((film) => hasText(film))
	) {
		return false;
	}

	if (hasText(workspace.development?.treatment)) {
		return false;
	}

	if (hasText(workspace.globalNotes)) {
		return false;
	}

	if (Object.values(workspace.sceneNotes ?? {}).some((note) => hasText(note))) {
		return false;
	}

	if ((workspace.scriptNotes ?? []).length > 0) {
		return false;
	}

	if (
		(workspace.development?.structureBeats ?? []).some((beat) => hasText(beat.summary)) ||
		(workspace.beatBoard ?? []).some((card) => hasText(card.beat) || hasText(card.heading))
	) {
		return false;
	}

	if (
		Object.values(workspace.characterProfiles ?? {}).some(
			(profile) =>
				hasText(profile.name) ||
				hasText(profile.want) ||
				hasText(profile.need) ||
				hasText(profile.flaw) ||
				hasText(profile.arc) ||
				hasText(profile.notes),
		)
	) {
		return false;
	}

	if (
		Object.values(workspace.locationProfiles ?? {}).some(
			(profile) => hasText(profile.location) || hasText(profile.description) || hasText(profile.notes),
		)
	) {
		return false;
	}

	if (workspace.guide?.active) {
		return false;
	}

	return true;
}

export function isUntitledScreenplayTitle(title: string | undefined | null): boolean {
	const normalized = title?.trim().toLowerCase() ?? '';
	return normalized === 'untitled' || normalized === 'untitled screenplay';
}

/** Err strict: any deviation from the default scratch template disqualifies the draft. */
export function isBlankDraft(document: ScreenplayDocumentRecord): boolean {
	if (!isUntitledScreenplayTitle(document.title)) {
		return false;
	}

	if (!isDefaultScratchContent(document.content)) {
		return false;
	}

	return isBlankWorkspace(document.workspace);
}

export function isSweepableBlankDraft(document: ScreenplayDocumentRecord, now = Date.now()): boolean {
	if (!isBlankDraft(document)) {
		return false;
	}

	const updatedAt = new Date(document.updatedAt).getTime();

	if (!Number.isFinite(updatedAt)) {
		return false;
	}

	return now - updatedAt >= SWEEP_AGE_MS;
}

export function hasRealScriptContent(document: ScreenplayDocumentRecord): boolean {
	return !isBlankDraft(document);
}
