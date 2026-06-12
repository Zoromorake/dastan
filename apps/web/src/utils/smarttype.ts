import type { JSONContent } from '@tiptap/core';
import type { ScreenplayBlockType, ScreenplayWorkspaceData } from '../types';
import { extractScenePrefix, getSceneHeadingPhase } from './scene-heading-tab';
import { getScreenplayBlocksFromContent } from './screenplay-text';

const SCENE_PREFIXES = ['INT.', 'EXT.', 'INT./EXT.', 'EXT./INT.'] as const;
const DEFAULT_TIMES = [
	'DAY',
	'NIGHT',
	'MORNING',
	'AFTERNOON',
	'EVENING',
	'SUNSET',
	'SUNRISE',
	'LATER',
	'CONTINUOUS',
	'SAME',
	'MOMENTS LATER',
] as const;
const DEFAULT_EXTENSIONS = ['(V.O.)', '(O.S.)', "(CONT'D)", '(O.C.)', '(FILTER)'] as const;
const DEFAULT_TRANSITIONS = [
	'CUT TO:',
	'FADE IN:',
	'FADE OUT.',
	'DISSOLVE TO:',
	'MATCH CUT TO:',
	'SMASH CUT TO:',
	'CUT TO BLACK.',
	'FADE TO BLACK.',
] as const;

export type SmartTypeGroup = 'prefix' | 'location' | 'time' | 'character' | 'extension' | 'transition';

export interface SmartTypeSuggestionItem {
	value: string;
	group: SmartTypeGroup;
}

export type SceneHeadingPhase = 'prefix' | 'location' | 'time';

export interface SmartTypeSuggestions {
	phase: SceneHeadingPhase | 'character' | 'extension' | 'transition' | 'none';
	items: SmartTypeSuggestionItem[];
	sectionLabel: string;
	hint?: string;
}

export const sceneHeadingSections = ['Scene setting', 'Location', 'Time of day'] as const;

export function getSmartTypeSectionLabel(
	phase: SmartTypeSuggestions['phase'],
): string {
	switch (phase) {
		case 'prefix':
			return 'Scene setting';
		case 'location':
			return 'Location';
		case 'time':
			return 'Time of day';
		case 'character':
			return 'Character';
		case 'extension':
			return 'Extension';
		case 'transition':
			return 'Transition';
		default:
			return 'Suggestions';
	}
}

export function getSceneHeadingSectionIndex(phase: SceneHeadingPhase): number {
	switch (phase) {
		case 'prefix':
			return 0;
		case 'location':
			return 1;
		case 'time':
			return 2;
	}
}

export interface SmartTypeSourceData {
	content: JSONContent | null;
	workspace?: ScreenplayWorkspaceData | null;
}

export interface SmartTypeLexicon {
	characters: string[];
	locations: string[];
	times: string[];
	extensions: string[];
	transitions: string[];
}

export type SmartTypeBlockType = Extract<ScreenplayBlockType, 'character' | 'scene_heading' | 'transition'>;

function normalizeCharacterName(value: string): string {
	return value.replace(/\(.*?\)/gu, '').trim().replace(/\s+/gu, ' ').toUpperCase();
}

function normalizeExtension(value: string): string {
	const inner = value.replace(/^\(|\)$/gu, '').trim().toUpperCase();
	return `(${inner})`;
}

function parseLocationFromSlugline(value: string): string | null {
	const slugline = value.trim();
	const withoutPrefix = slugline.replace(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.)\s*/iu, '');
	const [location] = withoutPrefix.split(/\s-\s/u).map((token) => token.trim());
	return location && location.length > 0 ? location.toUpperCase() : null;
}

function parseTimeFromSlugline(value: string): string | null {
	const parts = value.trim().split(/\s-\s/u);

	if (parts.length < 2) {
		return null;
	}

	const time = parts[parts.length - 1]?.trim();
	return time && time.length > 0 ? time.toUpperCase() : null;
}

function parseExtensionFromCharacter(value: string): string | null {
	const match = value.match(/\(([^)]+)\)/u);

	if (!match) {
		return null;
	}

	return normalizeExtension(`(${match[1]})`);
}

function applyExclusions(values: string[], excluded: string[] | undefined): string[] {
	if (!excluded || excluded.length === 0) {
		return values;
	}

	const blocked = new Set(excluded.map((value) => value.toUpperCase()));
	return values.filter((value) => !blocked.has(value.toUpperCase()));
}

function getCharacterPhase(query: string, characters: string[]): 'name' | 'extension' {
	const trimmed = query.trim();

	if (trimmed.length === 0) {
		return 'name';
	}

	if (trimmed.includes('(')) {
		return 'extension';
	}

	const upper = trimmed.toUpperCase();
	const partialMatches = characters.filter((character) => character.startsWith(upper) && character !== upper);

	if (partialMatches.length > 0) {
		return 'name';
	}

	if (characters.includes(upper) || upper.length >= 2) {
		return 'extension';
	}

	return 'name';
}

function filterPrefixSuggestions(query: string): string[] {
	const normalized = query.trim().toUpperCase();

	if (normalized.length === 0) {
		return [...SCENE_PREFIXES];
	}

	return SCENE_PREFIXES.filter((prefix) => prefix.startsWith(normalized) || normalized.startsWith(prefix.replace('.', '')));
}

function filterByQuery(values: string[], query: string, limit = 8): string[] {
	const normalized = query.trim().toUpperCase();

	if (normalized.length === 0) {
		return values.slice(0, limit);
	}

	return values.filter((value) => value.includes(normalized)).slice(0, limit);
}

export function collectSmartTypeLexicon(source: SmartTypeSourceData): SmartTypeLexicon {
	const blocks = getScreenplayBlocksFromContent(source.content);
	const exclusions = source.workspace?.smartTypeExclusions;
	const characters = new Set<string>();
	const locations = new Set<string>();
	const times = new Set<string>(DEFAULT_TIMES);
	const extensions = new Set<string>(DEFAULT_EXTENSIONS);
	const transitions = new Set<string>(DEFAULT_TRANSITIONS);

	for (const block of blocks) {
		if (block.type === 'character') {
			const name = normalizeCharacterName(block.text);

			if (name.length > 0) {
				characters.add(name);
			}

			const extension = parseExtensionFromCharacter(block.text);

			if (extension) {
				extensions.add(extension);
			}
		}

		if (block.type === 'scene_heading') {
			const location = parseLocationFromSlugline(block.text);

			if (location) {
				locations.add(location);
			}

			const time = parseTimeFromSlugline(block.text);

			if (time) {
				times.add(time);
			}
		}

		if (block.type === 'transition') {
			const transition = block.text.trim().toUpperCase();

			if (transition.length > 0) {
				transitions.add(transition);
			}
		}
	}

	for (const profile of Object.values(source.workspace?.characterProfiles ?? {})) {
		const name = normalizeCharacterName(profile.name);

		if (name.length > 0) {
			characters.add(name);
		}
	}

	for (const profile of Object.values(source.workspace?.locationProfiles ?? {})) {
		const location = profile.location.trim().toUpperCase();

		if (location.length > 0) {
			locations.add(location);
		}
	}

	return {
		characters: applyExclusions(Array.from(characters).sort(), exclusions?.characters),
		locations: applyExclusions(Array.from(locations).sort(), exclusions?.locations),
		times: applyExclusions(Array.from(times).sort(), exclusions?.times),
		extensions: applyExclusions(Array.from(extensions).sort(), exclusions?.extensions),
		transitions: applyExclusions(Array.from(transitions).sort(), exclusions?.transitions),
	};
}

export function extractSmartTypeSuggestions(
	source: SmartTypeSourceData,
	query = '',
	blockType: SmartTypeBlockType | null = null,
): SmartTypeSuggestions {
	const lexicon = collectSmartTypeLexicon(source);

	if (blockType === 'character') {
		const phase = getCharacterPhase(query, lexicon.characters);

		if (phase === 'extension') {
			const extensionQuery = query.includes('(') ? (query.split('(').pop()?.replace(/\)/gu, '') ?? '') : '';
			const items = filterByQuery(lexicon.extensions, extensionQuery).map((value) => ({
				value,
				group: 'extension' as const,
			}));

			return {
				phase: 'extension',
				sectionLabel: getSmartTypeSectionLabel('extension'),
				items,
			};
		}

		const items = filterByQuery(lexicon.characters, query).map((value) => ({
			value,
			group: 'character' as const,
		}));

		return {
			phase: 'character',
			sectionLabel: getSmartTypeSectionLabel('character'),
			items,
		};
	}

	if (blockType === 'transition') {
		const items = filterByQuery(lexicon.transitions, query).map((value) => ({
			value,
			group: 'transition' as const,
		}));

		return {
			phase: 'transition',
			sectionLabel: getSmartTypeSectionLabel('transition'),
			items,
		};
	}

	if (blockType !== 'scene_heading') {
		return { phase: 'none', sectionLabel: 'Suggestions', items: [] };
	}

	const phase = getSceneHeadingPhase(query);

	if (phase === 'prefix') {
		const prefixes = filterPrefixSuggestions(query);
		const items = prefixes.map((value) => ({ value, group: 'prefix' as const }));

		return {
			phase: 'prefix',
			sectionLabel: getSmartTypeSectionLabel('prefix'),
			items,
		};
	}

	if (phase === 'location') {
		const prefix = extractScenePrefix(query) ?? 'INT. ';
		const locationQuery = query.slice(prefix.length).trim();
		const items = filterByQuery(lexicon.locations, locationQuery).map((value) => ({
			value,
			group: 'location' as const,
		}));

		return {
			phase: 'location',
			sectionLabel: getSmartTypeSectionLabel('location'),
			items,
		};
	}

	const timeSeparator = /\s-\s*/u;
	const [, timeQuery = ''] = query.split(timeSeparator);
	const items = filterByQuery(lexicon.times, timeQuery).map((value) => ({
		value,
		group: 'time' as const,
	}));

	return {
		phase: 'time',
		sectionLabel: getSmartTypeSectionLabel('time'),
		items,
	};
}

export function applySmartTypeSelection(
	blockType: SmartTypeBlockType,
	currentText: string,
	selectedValue: string,
	group: SmartTypeGroup,
): string {
	if (blockType === 'character') {
		if (group === 'extension') {
			const base = normalizeCharacterName(currentText.split('(')[0] ?? currentText);
			const extension = selectedValue.startsWith('(') ? selectedValue : `(${selectedValue})`;
			return `${base} ${extension}`;
		}

		return selectedValue;
	}

	if (blockType === 'transition') {
		return selectedValue;
	}

	if (group === 'prefix') {
		return selectedValue.endsWith(' ') ? selectedValue : `${selectedValue} `;
	}

	if (group === 'location') {
		const rawPrefix = extractScenePrefix(currentText) ?? 'INT.';
		const prefix = rawPrefix.endsWith(' ') ? rawPrefix : `${rawPrefix} `;
		return `${prefix}${selectedValue} - `;
	}

	if (group === 'time') {
		const base = currentText.replace(/\s-\s[^]*$/u, '').trimEnd();
		return `${base} - ${selectedValue}`;
	}

	return selectedValue;
}

export function getPrimarySmartTypeSuggestion(suggestions: SmartTypeSuggestions): SmartTypeSuggestionItem | null {
	return suggestions.items[0] ?? null;
}
