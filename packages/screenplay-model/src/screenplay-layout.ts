import type {
	ScreenplayBlockType,
	ScreenplayCapitalization,
	ScreenplayDocumentLayout,
	ScreenplayElementBehavior,
	ScreenplayElementTextCase,
	ScreenplayElementAlignment,
	ScreenplayElementTypography,
	ScreenplayTitlePage,
} from './index';

const defaultBehaviorByType: Record<ScreenplayBlockType, ScreenplayElementBehavior> = {
	scene_heading: { enterTarget: 'action', tabTarget: 'action', shiftEnterTarget: null },
	action: { enterTarget: 'action', tabTarget: 'character', shiftEnterTarget: null },
	character: { enterTarget: 'dialogue', tabTarget: 'parenthetical', shiftEnterTarget: 'action' },
	dialogue: { enterTarget: 'character', tabTarget: 'parenthetical', shiftEnterTarget: null },
	parenthetical: { enterTarget: 'dialogue', tabTarget: 'dialogue', shiftEnterTarget: null },
	transition: { enterTarget: 'scene_heading', tabTarget: 'scene_heading', shiftEnterTarget: null },
	centered: { enterTarget: 'action', tabTarget: 'action', shiftEnterTarget: null },
	shot: { enterTarget: 'action', tabTarget: 'action', shiftEnterTarget: null },
	general: { enterTarget: 'action', tabTarget: 'action', shiftEnterTarget: null },
	lyrics: { enterTarget: 'lyrics', tabTarget: 'action', shiftEnterTarget: null },
};

const defaultAlignmentByType: Record<ScreenplayBlockType, ScreenplayElementAlignment> = {
	scene_heading: 'left',
	action: 'left',
	character: 'center',
	dialogue: 'left',
	parenthetical: 'center',
	transition: 'right',
	centered: 'center',
	shot: 'left',
	general: 'left',
	lyrics: 'center',
};

const defaultCaseByType: Record<ScreenplayBlockType, ScreenplayElementTextCase> = {
	scene_heading: 'uppercase',
	action: 'mixed',
	character: 'uppercase',
	dialogue: 'mixed',
	parenthetical: 'mixed',
	transition: 'uppercase',
	centered: 'mixed',
	shot: 'uppercase',
	general: 'mixed',
	lyrics: 'mixed',
};

const defaultCapitalizationByType: Record<ScreenplayBlockType, ScreenplayCapitalization> = {
	scene_heading: 'uppercase',
	action: 'as_typed',
	character: 'uppercase',
	dialogue: 'as_typed',
	parenthetical: 'as_typed',
	transition: 'uppercase',
	centered: 'as_typed',
	shot: 'uppercase',
	general: 'as_typed',
	lyrics: 'as_typed',
};

export function createDefaultElementTypography(blockType: ScreenplayBlockType): ScreenplayElementTypography {
	return {
		fontFamily: 'courier-prime',
		fontSize: 12,
		color: 'automatic',
		highlight: 'automatic',
		bold: blockType === 'scene_heading' || blockType === 'character' || blockType === 'transition' || blockType === 'shot',
		italic: blockType === 'parenthetical' || blockType === 'lyrics',
		underline: false,
		strikethrough: false,
		capitalization: defaultCapitalizationByType[blockType],
	};
}

export function createDefaultTitlePage(): ScreenplayTitlePage {
	const draftDate = new Date().toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});

	return {
		title: 'UNTITLED',
		writtenBy: 'Your Name',
		email: 'your.email@example.com',
		phone: '',
		contact: '',
		draftDate: `Draft — ${draftDate}`,
	};
}

function normalizeTitlePage(titlePage: ScreenplayTitlePage | undefined): ScreenplayTitlePage {
	const defaults = createDefaultTitlePage();
	const merged = { ...defaults, ...titlePage };
	const contactLines = merged.contact
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (!merged.email && contactLines.length > 0) {
		merged.email = contactLines[0] ?? '';
	}

	if (!merged.phone && contactLines.length > 1) {
		merged.phone = contactLines[1] ?? '';
	}

	return merged;
}

function createElementSettings(): ScreenplayDocumentLayout['elementSettings'] {
	return (Object.keys(defaultBehaviorByType) as ScreenplayBlockType[]).reduce(
		(settings, blockType) => {
			settings[blockType] = {
				alignment: defaultAlignmentByType[blockType],
				textCase: defaultCaseByType[blockType],
				behavior: defaultBehaviorByType[blockType],
				typography: createDefaultElementTypography(blockType),
			};
			return settings;
		},
		{} as ScreenplayDocumentLayout['elementSettings'],
	);
}

export function createDefaultDocumentLayout(): ScreenplayDocumentLayout {
	return {
		headerText: '{{title}}',
		footerText: '{{page}}.',
		authorName: 'Your Name',
		zoomLevel: 100,
		fontScale: 'standard',
		lineSpacing: 'standard',
		pageViewMode: 'paged',
		revisionColor: 'none',
		revisionModeActive: false,
		lockedPageCount: 0,
		showTitlePage: true,
		showSceneNumbers: true,
		titlePage: createDefaultTitlePage(),
		pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
		headerFooterMargins: { headerTop: 0.5, footerBottom: 0.5 },
		headerFooter: {
			showHeader: true,
			showHeaderOnFirstPage: false,
			showFooter: false,
			showFooterOnFirstPage: true,
		},
		pageAppearance: {
			backgroundColor: 'automatic',
			textColor: 'automatic',
		},
		dialogueBreaks: {
			showMoreAtPageBottom: true,
			moreText: '(MORE)',
			showContinuedAtPageTop: true,
			continuedText: "(CONT'D)",
			autoCharacterContinueds: true,
		},
		sceneBreaks: {
			showContinuedAtPageBottom: false,
			continuedBottomText: '(CONTINUED)',
			showContinuedAtPageTop: false,
			continuedTopText: 'CONTINUED:',
			showContinuedSceneNumber: false,
		},
		elementSettings: createElementSettings(),
	};
}

export function normalizeDocumentLayout(layout: ScreenplayDocumentLayout | undefined): ScreenplayDocumentLayout {
	const defaults = createDefaultDocumentLayout();

	return {
		...defaults,
		...layout,
		titlePage: normalizeTitlePage({
			...defaults.titlePage,
			...layout?.titlePage,
		}),
		pageMargins: {
			...defaults.pageMargins,
			...layout?.pageMargins,
			left: defaults.pageMargins.left,
			right: defaults.pageMargins.right,
		},
		pageViewMode: layout?.pageViewMode ?? defaults.pageViewMode,
		headerFooterMargins: {
			...defaults.headerFooterMargins,
			...layout?.headerFooterMargins,
		},
		headerFooter: {
			...defaults.headerFooter,
			...layout?.headerFooter,
		},
		pageAppearance: {
			...defaults.pageAppearance,
			...layout?.pageAppearance,
		},
		dialogueBreaks: {
			...defaults.dialogueBreaks,
			...layout?.dialogueBreaks,
		},
		sceneBreaks: {
			...defaults.sceneBreaks,
			...layout?.sceneBreaks,
		},
		elementSettings: (Object.keys(defaults.elementSettings) as ScreenplayBlockType[]).reduce(
			(settings, blockType) => {
				const defaultTypography = defaults.elementSettings[blockType].typography;
				const savedTypography = layout?.elementSettings?.[blockType]?.typography;

				settings[blockType] = {
					...defaults.elementSettings[blockType],
					...layout?.elementSettings?.[blockType],
					behavior: {
						...defaults.elementSettings[blockType].behavior,
						...layout?.elementSettings?.[blockType]?.behavior,
					},
					typography: {
						...defaultTypography,
						...savedTypography,
					},
				};
				return settings;
			},
			{} as ScreenplayDocumentLayout['elementSettings'],
		),
	};
}

export function renderLayoutTemplate(template: string, values: { title: string; page: number; author: string; date: string }): string {
	return template
		.replace(/\{\{title\}\}/gu, values.title)
		.replace(/\{\{page\}\}/gu, String(values.page))
		.replace(/\{\{author\}\}/gu, values.author)
		.replace(/\{\{date\}\}/gu, values.date);
}
