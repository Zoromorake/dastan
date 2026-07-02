import type { JSONContent } from '@tiptap/core';

export type ScreenplayBlockType =
	| 'scene_heading'
	| 'action'
	| 'character'
	| 'dialogue'
	| 'parenthetical'
	| 'transition'
	| 'centered'
	| 'shot'
	| 'general'
	| 'lyrics';

export type ScreenplaySaveStatus = 'saved' | 'saving' | 'unsaved';

export type ScreenplayZoomLevel = 90 | 100 | 110 | 125;

export type ScreenplayFontScale = 'compact' | 'standard' | 'comfortable';

export type ScreenplayLineSpacing = 'tight' | 'standard' | 'relaxed';

export type ScreenplayElementAlignment = 'left' | 'center' | 'right';

export type ScreenplayElementTextCase = 'mixed' | 'uppercase';

export type ScreenplayRevisionColor = 'none' | 'blue' | 'pink' | 'green' | 'yellow';

export type ScreenplayPageViewMode = 'continuous' | 'paged';

export type ScreenplayColorSetting = 'automatic' | 'black' | 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'gray';

export type ScreenplayFontFamily = 'courier-prime' | 'courier-new';

export type ScreenplayCapitalization = 'as_typed' | 'uppercase' | 'lowercase';

export interface ScreenplayPageMargins {
	top: number;
	bottom: number;
	left: number;
	right: number;
}

export interface ScreenplayHeaderFooterMargins {
	headerTop: number;
	footerBottom: number;
}

export interface ScreenplayHeaderFooterSettings {
	showHeader: boolean;
	showHeaderOnFirstPage: boolean;
	showFooter: boolean;
	showFooterOnFirstPage: boolean;
}

export interface ScreenplayPageAppearance {
	backgroundColor: ScreenplayColorSetting;
	textColor: ScreenplayColorSetting;
}

export interface ScreenplayDialogueBreakSettings {
	showMoreAtPageBottom: boolean;
	moreText: string;
	showContinuedAtPageTop: boolean;
	continuedText: string;
	autoCharacterContinueds: boolean;
}

export interface ScreenplaySceneBreakSettings {
	showContinuedAtPageBottom: boolean;
	continuedBottomText: string;
	showContinuedAtPageTop: boolean;
	continuedTopText: string;
	showContinuedSceneNumber: boolean;
}

export interface ScreenplayElementTypography {
	fontFamily: ScreenplayFontFamily;
	fontSize: 10 | 11 | 12 | 13 | 14;
	color: ScreenplayColorSetting;
	highlight: ScreenplayColorSetting;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	strikethrough: boolean;
	capitalization: ScreenplayCapitalization;
}

export interface ScreenplayElementBehavior {
	enterTarget: ScreenplayBlockType;
	tabTarget: ScreenplayBlockType;
	shiftEnterTarget: ScreenplayBlockType | null;
}

export interface ScreenplayElementSettings {
	alignment: ScreenplayElementAlignment;
	textCase: ScreenplayElementTextCase;
	behavior: ScreenplayElementBehavior;
	typography: ScreenplayElementTypography;
}

export interface ScreenplayTitlePage {
	title: string;
	writtenBy: string;
	email: string;
	phone: string;
	contact: string;
	draftDate: string;
}

export interface ScreenplayDocumentLayout {
	headerText: string;
	footerText: string;
	authorName: string;
	zoomLevel: ScreenplayZoomLevel;
	fontScale: ScreenplayFontScale;
	lineSpacing: ScreenplayLineSpacing;
	pageViewMode: ScreenplayPageViewMode;
	revisionColor: ScreenplayRevisionColor;
	revisionModeActive: boolean;
	lockedPageCount: number;
	showTitlePage: boolean;
	showSceneNumbers: boolean;
	titlePage: ScreenplayTitlePage;
	pageMargins: ScreenplayPageMargins;
	headerFooterMargins: ScreenplayHeaderFooterMargins;
	headerFooter: ScreenplayHeaderFooterSettings;
	pageAppearance: ScreenplayPageAppearance;
	dialogueBreaks: ScreenplayDialogueBreakSettings;
	sceneBreaks: ScreenplaySceneBreakSettings;
	elementSettings: Record<ScreenplayBlockType, ScreenplayElementSettings>;
}

export type ScriptTemplate = 'feature' | 'short' | 'tv_pilot' | 'tv_episode' | 'stage_play' | 'documentary';

export type StructureTemplate = 'three-act' | 'save-the-cat' | 'blank';

export interface StoryBasics {
	logline: string;
	synopsis: string;
	genre: string;
	actSummaries: [string, string, string];
}

export interface StructureBeat {
	id: string;
	key: string;
	label: string;
	pageHint: string;
	summary: string;
	order: number;
	/** Block index of the linked scene heading in the screenplay, when mapped. */
	linkedSceneIndex?: number;
}

export interface StoryDevelopment {
	basics: StoryBasics;
	structureTemplate: StructureTemplate;
	structureBeats: StructureBeat[];
	treatment: string;
	beatsViewMode: 'board' | 'list';
}

export interface BeatBoardCard {
	id: string;
	sceneIndex: number;
	heading: string;
	beat: string;
	order: number;
}

export interface CharacterProfile {
	name: string;
	age?: string;
	arc?: string;
	notes?: string;
}

export interface LocationProfile {
	location: string;
	description?: string;
	notes?: string;
}

export interface ScriptNoteReply {
	id: string;
	author: string;
	body: string;
	createdAt: string;
}

export interface ScreenplayScriptNote {
	id: string;
	blockIndex: number;
	replies: ScriptNoteReply[];
	createdAt: string;
	updatedAt: string;
}

export interface SmartTypeExclusions {
	characters?: string[];
	locations?: string[];
	times?: string[];
	transitions?: string[];
	extensions?: string[];
}

export interface ScreenplayWorkspaceData {
	globalNotes: string;
	sceneNotes: Record<number, string>;
	scriptNotes: ScreenplayScriptNote[];
	development: StoryDevelopment;
	beatBoard: BeatBoardCard[];
	characterProfiles: Record<string, CharacterProfile>;
	locationProfiles: Record<string, LocationProfile>;
	smartTypeExclusions?: SmartTypeExclusions;
}

export interface ScreenplayDocumentRecord {
	id: string;
	title: string;
	updatedAt: string;
	createdAt?: string;
	projectId?: string;
	deletedAt?: string;
	layout?: ScreenplayDocumentLayout;
	workspace?: ScreenplayWorkspaceData;
	content: JSONContent;
}

export interface ScreenplayVersionSnapshot {
	id: string;
	documentId: string;
	savedAt: string;
	title: string;
	content: JSONContent;
	label?: string;
	isManual?: boolean;
}

export interface ScreenplayProjectRecord {
	id: string;
	title: string;
	parentProjectId?: string | null;
	genre?: string;
	logline?: string;
	synopsis?: string;
	coverImageDataUrl?: string | null;
	updatedAt: string;
	deletedAt?: string;
}

export function normalizeProjectRecord(project: ScreenplayProjectRecord): ScreenplayProjectRecord {
	return {
		...project,
		title: project.title?.trim() || 'Untitled Project',
		parentProjectId: project.parentProjectId ?? null,
		genre: project.genre ?? '',
		logline: project.logline ?? '',
		synopsis: project.synopsis ?? '',
		coverImageDataUrl: project.coverImageDataUrl ?? null,
	};
}

export interface ScreenplaySceneReference {
	index: number;
	text: string;
}

export function createDefaultStoryDevelopment(): StoryDevelopment {
	return {
		basics: {
			logline: '',
			synopsis: '',
			genre: '',
			actSummaries: ['', '', ''],
		},
		structureTemplate: 'save-the-cat',
		structureBeats: [],
		treatment: '',
		beatsViewMode: 'board',
	};
}

export function createDefaultWorkspaceData(): ScreenplayWorkspaceData {
	return {
		globalNotes: '',
		sceneNotes: {},
		scriptNotes: [],
		development: createDefaultStoryDevelopment(),
		beatBoard: [],
		characterProfiles: {},
		locationProfiles: {},
		smartTypeExclusions: {},
	};
}

export function normalizeStoryDevelopment(development: StoryDevelopment | undefined): StoryDevelopment {
	const defaults = createDefaultStoryDevelopment();

	if (!development) {
		return defaults;
	}

	const actSummaries = development.basics?.actSummaries ?? defaults.basics.actSummaries;

	return {
		...defaults,
		...development,
		basics: {
			...defaults.basics,
			...development.basics,
			actSummaries: [
				actSummaries[0] ?? '',
				actSummaries[1] ?? '',
				actSummaries[2] ?? '',
			],
		},
		structureBeats: development.structureBeats ?? defaults.structureBeats,
	};
}

export function normalizeScriptNote(note: ScreenplayScriptNote & { body?: string }): ScreenplayScriptNote {
	if (Array.isArray(note.replies)) {
		return note;
	}

	const createdAt = note.createdAt ?? new Date().toISOString();
	const legacyBody = typeof note.body === 'string' ? note.body.trim() : '';

	return {
		id: note.id,
		blockIndex: note.blockIndex,
		replies:
			legacyBody.length > 0
				? [
						{
							id: crypto.randomUUID(),
							author: 'You',
							body: legacyBody,
							createdAt,
						},
					]
				: [],
		createdAt,
		updatedAt: note.updatedAt ?? createdAt,
	};
}

export function normalizeWorkspaceData(workspace: ScreenplayWorkspaceData | undefined): ScreenplayWorkspaceData {
	const defaults = createDefaultWorkspaceData();

	return {
		...defaults,
		...workspace,
		sceneNotes: { ...defaults.sceneNotes, ...workspace?.sceneNotes },
		scriptNotes: (workspace?.scriptNotes ?? defaults.scriptNotes).map((note) => normalizeScriptNote(note)),
		development: normalizeStoryDevelopment(workspace?.development),
		beatBoard: workspace?.beatBoard ?? defaults.beatBoard,
		characterProfiles: { ...defaults.characterProfiles, ...workspace?.characterProfiles },
		locationProfiles: { ...defaults.locationProfiles, ...workspace?.locationProfiles },
		smartTypeExclusions: {
			...defaults.smartTypeExclusions,
			...workspace?.smartTypeExclusions,
		},
	};
}

export const SCREENPLAY_BLOCK_TYPES: ScreenplayBlockType[] = [
	'scene_heading',
	'action',
	'character',
	'dialogue',
	'parenthetical',
	'transition',
	'centered',
	'shot',
	'general',
	'lyrics',
];

export function isScreenplayBlockType(value: string): value is ScreenplayBlockType {
	return (SCREENPLAY_BLOCK_TYPES as string[]).includes(value);
}
