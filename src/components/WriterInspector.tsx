import { useMemo, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import {
	SCREENPLAY_BLOCK_TYPES,
	type ScreenplayBlockType,
	type ScreenplayDocumentLayout,
	type ScreenplayElementTypography,
	type ScreenplayFontFamily,
	type ScreenplayRevisionColor,
	type ScreenplayWorkspaceData,
	type SmartTypeExclusions,
} from '../types';
import { ChevronRight } from 'lucide-react';
import { ElementPicker } from './ElementPicker';
import {
	CollapsibleSection,
	ColorSettingSelect,
	InspectorRow,
	KeyCap,
	MarginInchesInput,
	StyleToggleButton,
	YesNoToggle,
} from './inspector/InspectorControls';
import { collectSmartTypeLexicon } from '../utils/smarttype';

type InspectorTab = 'elements' | 'smarttype' | 'layout';

interface WriterInspectorProps {
	activeBlockType: ScreenplayBlockType | null;
	documentContent: JSONContent | null;
	documentTitle: string;
	documentLayout: ScreenplayDocumentLayout;
	documentWorkspace: ScreenplayWorkspaceData;
	resolvedTheme: 'light' | 'dark';
	collapsed: boolean;
	onToggleCollapsed: () => void;
	onTitleChange: (title: string) => void;
	onLayoutChange: (layout: Partial<ScreenplayDocumentLayout>) => void;
	onElementBehaviorChange: (blockType: ScreenplayBlockType, field: 'enterTarget' | 'tabTarget', value: ScreenplayBlockType) => void;
	onElementTypographyChange: (blockType: ScreenplayBlockType, typography: Partial<ScreenplayElementTypography>) => void;
	onBlockTypeChange: (blockType: ScreenplayBlockType) => void;
	onWorkspaceChange: (workspace: Partial<ScreenplayWorkspaceData>) => void;
}

type SmartTypeListKey = keyof SmartTypeExclusions;

const blockDescriptions: Record<ScreenplayBlockType, string> = {
	scene_heading: 'Uppercase sluglines used to define scene location and time.',
	action: 'Narrative action lines that describe what is happening on screen.',
	character: 'Character cues centered before spoken dialogue.',
	dialogue: 'Spoken lines delivered by the active character.',
	parenthetical: 'Short performance directions attached to dialogue.',
	transition: 'Editorial transition cues such as CUT TO or FADE OUT.',
	centered: 'Centered text for titles, chyrons, or special emphasis.',
	shot: 'Camera or editorial shot directions.',
	general: 'General-purpose text blocks for notes and custom formatting.',
	lyrics: 'Centered lyrical lines for musical sequences.',
};

const blockLabels: Record<ScreenplayBlockType, string> = {
	scene_heading: 'Scene Heading',
	action: 'Action',
	character: 'Character',
	dialogue: 'Dialogue',
	parenthetical: 'Parenthetical',
	transition: 'Transition',
	centered: 'Centered',
	shot: 'Shot',
	general: 'General',
	lyrics: 'Lyrics',
};

const revisionColors: ScreenplayRevisionColor[] = ['none', 'blue', 'pink', 'green', 'yellow'];

const smartTypeListLabels: Record<SmartTypeListKey, string> = {
	characters: 'Characters',
	locations: 'Locations',
	times: 'Times',
	transitions: 'Transitions',
	extensions: 'Extensions',
};

export function WriterInspector({
	activeBlockType,
	documentContent,
	documentTitle,
	documentLayout,
	documentWorkspace,
	resolvedTheme,
	collapsed,
	onToggleCollapsed,
	onTitleChange,
	onLayoutChange,
	onElementBehaviorChange,
	onElementTypographyChange,
	onBlockTypeChange,
	onWorkspaceChange,
}: WriterInspectorProps) {
	const [activeTab, setActiveTab] = useState<InspectorTab>('elements');
	const [activeSmartTypeList, setActiveSmartTypeList] = useState<SmartTypeListKey>('characters');
	const currentType = activeBlockType ?? 'action';
	const isDark = resolvedTheme === 'dark';
	const currentSettings = documentLayout.elementSettings[currentType];
	const currentTypography = currentSettings.typography;

	const asideClass = isDark
		? `flex min-h-0 shrink-0 flex-col overflow-hidden border-l border-slate-700 bg-slate-800 transition-all duration-200 ${collapsed ? 'w-12' : 'w-[22rem]'}`
		: `flex min-h-0 shrink-0 flex-col overflow-hidden border-l border-stone-300 bg-[#f6f2ea] transition-all duration-200 ${collapsed ? 'w-12' : 'w-[22rem]'}`;
	const headerBorderClass = isDark ? 'border-b border-slate-700 px-4 py-3' : 'border-b border-stone-300 px-4 py-3';
	const labelClass = isDark ? 'text-[10px] uppercase tracking-[0.24em] text-slate-400' : 'text-[10px] uppercase tracking-[0.24em] text-stone-500';
	const bodyClass = isDark ? 'space-y-4 overflow-y-auto p-4 text-sm text-slate-300' : 'space-y-4 overflow-y-auto p-4 text-sm text-stone-700';
	const sectionClass = isDark ? 'rounded-2xl border border-slate-700 bg-slate-900 p-4' : 'rounded-2xl border border-stone-300 bg-white p-4';
	const sectionLabelClass = isDark
		? 'flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500'
		: 'flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-stone-500';
	const descClass = isDark ? 'mt-2 leading-6 text-slate-400' : 'mt-2 leading-6 text-stone-600';
	const selectClass = isDark
		? 'mt-1 w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200'
		: 'mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700';
	const inputClass = isDark
		? 'mt-1 w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200'
		: 'mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700';
	const activeTabClass = isDark ? 'rounded-full bg-slate-600 px-3 py-1 text-slate-100' : 'rounded-full bg-stone-900 px-3 py-1 text-stone-100';
	const inactiveTabClass = isDark ? 'rounded-full border border-slate-600 px-3 py-1 text-slate-400' : 'rounded-full border border-stone-300 px-3 py-1 text-stone-500';
	const pillClass = isDark
		? 'rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300'
		: 'rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-stone-600';

	const tabLabels: Record<InspectorTab, string> = { elements: 'Elements', smarttype: 'SmartType', layout: 'Layout' };

	const smartTypeLexicon = useMemo(
		() =>
			collectSmartTypeLexicon({
				content: documentContent,
				workspace: documentWorkspace,
			}),
		[documentContent, documentWorkspace],
	);

	const activeSmartTypeValues = smartTypeLexicon[activeSmartTypeList];
	const activeSmartTypeExcluded = documentWorkspace.smartTypeExclusions?.[activeSmartTypeList] ?? [];

	const excludeSmartTypeEntry = (listKey: SmartTypeListKey, value: string) => {
		const current = documentWorkspace.smartTypeExclusions?.[listKey] ?? [];
		onWorkspaceChange({
			smartTypeExclusions: {
				...documentWorkspace.smartTypeExclusions,
				[listKey]: [...current, value],
			},
		});
	};

	const restoreSmartTypeEntry = (listKey: SmartTypeListKey, value: string) => {
		const current = documentWorkspace.smartTypeExclusions?.[listKey] ?? [];
		onWorkspaceChange({
			smartTypeExclusions: {
				...documentWorkspace.smartTypeExclusions,
				[listKey]: current.filter((entry) => entry.toUpperCase() !== value.toUpperCase()),
			},
		});
	};

	if (collapsed) {
		return (
			<aside className={asideClass}>
				<div className="flex h-full items-start justify-center px-1 py-3">
					<button
						className={`h-9 w-9 rounded-md border text-xs ${isDark ? 'border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white' : 'border-stone-300 text-stone-600 hover:border-stone-500 hover:text-stone-900'}`}
						type="button"
						onClick={onToggleCollapsed}
						title="Open inspector"
						aria-label="Open inspector"
					>
						i
					</button>
				</div>
			</aside>
		);
	}

	return (
		<aside className={asideClass}>
			<div className={headerBorderClass}>
				<div className="flex items-center justify-between gap-2">
					<div className={labelClass}>Document</div>
					<button
						className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${isDark ? 'border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white' : 'border-stone-300 text-stone-600 hover:border-stone-500 hover:text-stone-900'}`}
						type="button"
						onClick={onToggleCollapsed}
					>
						Hide
					</button>
				</div>
				<div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em]">
					{(['elements', 'smarttype', 'layout'] as InspectorTab[]).map((tab) => (
						<button
							key={tab}
							className={activeTab === tab ? activeTabClass : inactiveTabClass}
							type="button"
							onClick={() => setActiveTab(tab)}
						>
							{tabLabels[tab]}
						</button>
					))}
				</div>
			</div>

			<div className={bodyClass}>
				{activeTab === 'elements' ? (
					<>
						<section className={sectionClass}>
							<div className={`mb-3 ${sectionLabelClass}`}>
								<span>Selected Block</span>
							</div>
							<ElementPicker
								fullWidth
								isDark={isDark}
								labels={blockLabels}
								value={currentType}
								variant="header"
								onChange={onBlockTypeChange}
							/>
							<p className={`mt-3 ${descClass}`}>{blockDescriptions[currentType]}</p>
						</section>

						<section className={sectionClass}>
							<div className={`mb-3 ${sectionLabelClass}`}>
								<span>Importante</span>
							</div>
							<label className="mb-3 block text-xs">
								<span>Script title</span>
								<input
									className={inputClass}
									spellCheck={false}
									value={documentTitle}
									onChange={(event) => {
										const nextTitle = event.target.value;
										onTitleChange(nextTitle);
										onLayoutChange({
											titlePage: { ...documentLayout.titlePage, title: nextTitle },
										});
									}}
								/>
							</label>
							<label className="mb-3 block text-xs">
								<span>Author</span>
								<input
									className={inputClass}
									spellCheck={false}
									value={documentLayout.authorName}
									onChange={(event) => {
										const nextAuthor = event.target.value;
										onLayoutChange({
											authorName: nextAuthor,
											titlePage: { ...documentLayout.titlePage, writtenBy: nextAuthor },
										});
									}}
								/>
							</label>
							<label className="mb-3 block text-xs">
								<span>Email</span>
								<input
									className={inputClass}
									spellCheck={false}
									type="email"
									value={documentLayout.titlePage.email}
									onChange={(event) =>
										onLayoutChange({
											titlePage: { ...documentLayout.titlePage, email: event.target.value },
										})
									}
								/>
							</label>
							<label className="block text-xs">
								<span>Phone</span>
								<input
									className={inputClass}
									spellCheck={false}
									type="tel"
									value={documentLayout.titlePage.phone}
									onChange={(event) =>
										onLayoutChange({
											titlePage: { ...documentLayout.titlePage, phone: event.target.value },
										})
									}
								/>
							</label>
						</section>

						<CollapsibleSection isDark={isDark} title="Shortcuts">
							<div className="space-y-2">
								<div
									className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-stone-200 bg-stone-50'}`}
								>
									<KeyCap isDark={isDark}>↵</KeyCap>
									<ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isDark ? 'text-slate-500' : 'text-stone-400'}`} />
									<select
										aria-label="Return shortcut target"
										className={`${selectClass} mt-0 min-w-0 flex-1`}
										value={currentSettings.behavior.enterTarget}
										onChange={(event) =>
											onElementBehaviorChange(currentType, 'enterTarget', event.target.value as ScreenplayBlockType)
										}
									>
										{SCREENPLAY_BLOCK_TYPES.map((blockType) => (
											<option key={blockType} value={blockType}>
												{blockLabels[blockType]}
											</option>
										))}
									</select>
								</div>
								<div
									className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-stone-200 bg-stone-50'}`}
								>
									<KeyCap isDark={isDark}>Tab</KeyCap>
									<ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isDark ? 'text-slate-500' : 'text-stone-400'}`} />
									<select
										aria-label="Tab shortcut target"
										className={`${selectClass} mt-0 min-w-0 flex-1`}
										value={currentSettings.behavior.tabTarget}
										onChange={(event) =>
											onElementBehaviorChange(currentType, 'tabTarget', event.target.value as ScreenplayBlockType)
										}
									>
										{SCREENPLAY_BLOCK_TYPES.map((blockType) => (
											<option key={blockType} value={blockType}>
												{blockLabels[blockType]}
											</option>
										))}
									</select>
								</div>
							</div>
						</CollapsibleSection>

						{currentType === 'scene_heading' ? (
							<CollapsibleSection isDark={isDark} title="Scene Breaks">
								<InspectorRow isDark={isDark} label="Bottom of Page">
									<YesNoToggle
										isDark={isDark}
										value={documentLayout.sceneBreaks.showContinuedAtPageBottom}
										onChange={(value) =>
											onLayoutChange({
												sceneBreaks: { ...documentLayout.sceneBreaks, showContinuedAtPageBottom: value },
											})
										}
									/>
								</InspectorRow>
								<input
									className={`${inputClass} mb-2 w-full`}
									value={documentLayout.sceneBreaks.continuedBottomText}
									onChange={(event) =>
										onLayoutChange({
											sceneBreaks: { ...documentLayout.sceneBreaks, continuedBottomText: event.target.value },
										})
									}
								/>
								<InspectorRow isDark={isDark} label="Top of Next Page">
									<YesNoToggle
										isDark={isDark}
										value={documentLayout.sceneBreaks.showContinuedAtPageTop}
										onChange={(value) =>
											onLayoutChange({
												sceneBreaks: { ...documentLayout.sceneBreaks, showContinuedAtPageTop: value },
											})
										}
									/>
								</InspectorRow>
								<input
									className={`${inputClass} mb-2 w-full`}
									value={documentLayout.sceneBreaks.continuedTopText}
									onChange={(event) =>
										onLayoutChange({
											sceneBreaks: { ...documentLayout.sceneBreaks, continuedTopText: event.target.value },
										})
									}
								/>
								<InspectorRow isDark={isDark} label="Continued (#)">
									<YesNoToggle
										isDark={isDark}
										value={documentLayout.sceneBreaks.showContinuedSceneNumber}
										onChange={(value) =>
											onLayoutChange({
												sceneBreaks: { ...documentLayout.sceneBreaks, showContinuedSceneNumber: value },
											})
										}
									/>
								</InspectorRow>
							</CollapsibleSection>
						) : null}

						<CollapsibleSection isDark={isDark} title="Typography">
							<label className="mb-3 block text-xs">
								<span>Font</span>
								<select
									className={selectClass}
									value={currentTypography.fontFamily}
									onChange={(event) =>
										onElementTypographyChange(currentType, { fontFamily: event.target.value as ScreenplayFontFamily })
									}
								>
									<option value="courier-prime">Courier Prime</option>
									<option value="courier-new">Courier New</option>
								</select>
							</label>
							<label className="mb-3 block text-xs">
								<span>Size</span>
								<select
									className={selectClass}
									value={currentTypography.fontSize}
									onChange={(event) =>
										onElementTypographyChange(currentType, {
											fontSize: Number.parseInt(event.target.value, 10) as ScreenplayElementTypography['fontSize'],
										})
									}
								>
									{[10, 11, 12, 13, 14].map((size) => (
										<option key={size} value={size}>
											{size}
										</option>
									))}
								</select>
							</label>
							<label className="mb-3 block text-xs">
								<span>Color</span>
								<ColorSettingSelect
									isDark={isDark}
									selectClass={selectClass}
									value={currentTypography.color}
									onChange={(value) => onElementTypographyChange(currentType, { color: value })}
								/>
							</label>
							<label className="mb-3 block text-xs">
								<span>Highlight</span>
								<ColorSettingSelect
									isDark={isDark}
									selectClass={selectClass}
									value={currentTypography.highlight}
									onChange={(value) => onElementTypographyChange(currentType, { highlight: value })}
								/>
							</label>
							<div className="mb-3">
								<span className="mb-2 block text-xs">Style</span>
								<div className="flex gap-1">
									<StyleToggleButton
										active={currentTypography.bold}
										isDark={isDark}
										label="B"
										onClick={() => onElementTypographyChange(currentType, { bold: !currentTypography.bold })}
									/>
									<StyleToggleButton
										active={currentTypography.italic}
										isDark={isDark}
										label="I"
										onClick={() => onElementTypographyChange(currentType, { italic: !currentTypography.italic })}
									/>
									<StyleToggleButton
										active={currentTypography.underline}
										isDark={isDark}
										label="U"
										onClick={() => onElementTypographyChange(currentType, { underline: !currentTypography.underline })}
									/>
									<StyleToggleButton
										active={currentTypography.strikethrough}
										isDark={isDark}
										label="S"
										onClick={() => onElementTypographyChange(currentType, { strikethrough: !currentTypography.strikethrough })}
									/>
								</div>
							</div>
							<label className="block text-xs">
								<span>Capitalization</span>
								<select
									className={selectClass}
									value={currentTypography.capitalization}
									onChange={(event) =>
										onElementTypographyChange(currentType, {
											capitalization: event.target.value as ScreenplayElementTypography['capitalization'],
										})
									}
								>
									<option value="as_typed">As Typed</option>
									<option value="uppercase">Uppercase</option>
									<option value="lowercase">Lowercase</option>
								</select>
							</label>
						</CollapsibleSection>
					</>
				) : activeTab === 'smarttype' ? (
					<section className={sectionClass}>
						<label className="mb-3 block text-xs">
							<span>Type</span>
							<select
								className={selectClass}
								value={activeSmartTypeList}
								onChange={(event) => setActiveSmartTypeList(event.target.value as SmartTypeListKey)}
							>
								{(Object.keys(smartTypeListLabels) as SmartTypeListKey[]).map((key) => (
									<option key={key} value={key}>
										{smartTypeListLabels[key]}
									</option>
								))}
							</select>
						</label>

						<div className={`mb-3 flex items-center justify-between text-xs ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
							<span>{smartTypeListLabels[activeSmartTypeList]}</span>
							<span>{activeSmartTypeValues.length}</span>
						</div>

						{activeSmartTypeValues.length === 0 ? (
							<p className={descClass}>Nothing learned yet.</p>
						) : (
							<ul className="space-y-1">
								{activeSmartTypeValues.map((value) => (
									<li
										key={value}
										className={`flex items-center justify-between rounded-lg border px-2 py-1.5 font-mono text-[11px] ${isDark ? 'border-slate-700 text-slate-200' : 'border-stone-200 text-stone-700'}`}
									>
										<span className="truncate">{value}</span>
										<button
											className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-stone-400 hover:bg-stone-100'}`}
											type="button"
											onClick={() => excludeSmartTypeEntry(activeSmartTypeList, value)}
										>
											Hide
										</button>
									</li>
								))}
							</ul>
						)}

						{activeSmartTypeExcluded.length > 0 ? (
							<div className="mt-3 space-y-1">
								<p className={`text-[10px] uppercase tracking-[0.16em] ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Hidden</p>
								{activeSmartTypeExcluded.map((value) => (
									<button
										key={value}
										className={`block w-full rounded-lg border border-dashed px-2 py-1 text-left font-mono text-[11px] ${isDark ? 'border-slate-700 text-slate-500 hover:bg-slate-800' : 'border-stone-200 text-stone-400 hover:bg-stone-50'}`}
										type="button"
										onClick={() => restoreSmartTypeEntry(activeSmartTypeList, value)}
									>
										Restore {value}
									</button>
								))}
							</div>
						) : null}
					</section>
				) : (
					<>
						<CollapsibleSection isDark={isDark} title="Page Layout">
							<p className={`mb-3 text-xs ${descClass}`}>Text margins (inches)</p>
							<InspectorRow isDark={isDark} label="Top">
								<MarginInchesInput
									inputClass={inputClass}
									isDark={isDark}
									value={documentLayout.pageMargins.top}
									onChange={(value) => onLayoutChange({ pageMargins: { ...documentLayout.pageMargins, top: value } })}
								/>
							</InspectorRow>
							<InspectorRow isDark={isDark} label="Bottom">
								<MarginInchesInput
									inputClass={inputClass}
									isDark={isDark}
									value={documentLayout.pageMargins.bottom}
									onChange={(value) => onLayoutChange({ pageMargins: { ...documentLayout.pageMargins, bottom: value } })}
								/>
							</InspectorRow>

							<label className="mb-3 mt-4 block text-xs">
								<span>Page background</span>
								<ColorSettingSelect
									isDark={isDark}
									selectClass={selectClass}
									value={documentLayout.pageAppearance.backgroundColor}
									onChange={(value) =>
										onLayoutChange({ pageAppearance: { ...documentLayout.pageAppearance, backgroundColor: value } })
									}
								/>
							</label>
							<label className="mb-3 block text-xs">
								<span>Default text color</span>
								<ColorSettingSelect
									isDark={isDark}
									selectClass={selectClass}
									value={documentLayout.pageAppearance.textColor}
									onChange={(value) =>
										onLayoutChange({ pageAppearance: { ...documentLayout.pageAppearance, textColor: value } })
									}
								/>
							</label>
							<p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
								Automatic follows the editor theme. Inline colored text in the script is left unchanged.
							</p>

							<label className="mb-3 mt-4 flex items-center gap-2 text-xs">
								<input
									checked={documentLayout.showTitlePage}
									type="checkbox"
									onChange={(event) => onLayoutChange({ showTitlePage: event.target.checked })}
								/>
								<span>Show title page</span>
							</label>
							<label className="flex items-center gap-2 text-xs">
								<input
									checked={documentLayout.showSceneNumbers}
									type="checkbox"
									onChange={(event) => onLayoutChange({ showSceneNumbers: event.target.checked })}
								/>
								<span>Show scene numbers</span>
							</label>
						</CollapsibleSection>

						<CollapsibleSection isDark={isDark} title="Header and Footer">
							<label className="mb-3 block text-xs">
								<span>Header template</span>
								<input
									className={inputClass}
									value={documentLayout.headerText}
									onChange={(event) => onLayoutChange({ headerText: event.target.value })}
								/>
							</label>
							<label className="mb-3 block text-xs">
								<span>Footer template</span>
								<input
									className={inputClass}
									value={documentLayout.footerText}
									onChange={(event) => onLayoutChange({ footerText: event.target.value })}
								/>
							</label>
							<InspectorRow isDark={isDark} label="Show Header">
								<YesNoToggle
									isDark={isDark}
									value={documentLayout.headerFooter.showHeader}
									onChange={(value) =>
										onLayoutChange({ headerFooter: { ...documentLayout.headerFooter, showHeader: value } })
									}
								/>
							</InspectorRow>
							<InspectorRow isDark={isDark} label="Show Header on First Page">
								<YesNoToggle
									isDark={isDark}
									value={documentLayout.headerFooter.showHeaderOnFirstPage}
									onChange={(value) =>
										onLayoutChange({ headerFooter: { ...documentLayout.headerFooter, showHeaderOnFirstPage: value } })
									}
								/>
							</InspectorRow>
							<InspectorRow isDark={isDark} label="Show Footer">
								<YesNoToggle
									isDark={isDark}
									value={documentLayout.headerFooter.showFooter}
									onChange={(value) =>
										onLayoutChange({ headerFooter: { ...documentLayout.headerFooter, showFooter: value } })
									}
								/>
							</InspectorRow>
							<InspectorRow isDark={isDark} label="Show Footer on First Page">
								<YesNoToggle
									isDark={isDark}
									value={documentLayout.headerFooter.showFooterOnFirstPage}
									onChange={(value) =>
										onLayoutChange({ headerFooter: { ...documentLayout.headerFooter, showFooterOnFirstPage: value } })
									}
								/>
							</InspectorRow>
							<p className={`mb-3 mt-4 text-xs ${descClass}`}>Position (inches)</p>
							<InspectorRow isDark={isDark} label="Header from top">
								<MarginInchesInput
									inputClass={inputClass}
									isDark={isDark}
									value={documentLayout.headerFooterMargins.headerTop}
									onChange={(value) =>
										onLayoutChange({
											headerFooterMargins: { ...documentLayout.headerFooterMargins, headerTop: value },
										})
									}
								/>
							</InspectorRow>
							<InspectorRow isDark={isDark} label="Footer from bottom">
								<MarginInchesInput
									inputClass={inputClass}
									isDark={isDark}
									value={documentLayout.headerFooterMargins.footerBottom}
									onChange={(value) =>
										onLayoutChange({
											headerFooterMargins: { ...documentLayout.headerFooterMargins, footerBottom: value },
										})
									}
								/>
							</InspectorRow>
						</CollapsibleSection>

						<CollapsibleSection isDark={isDark} title="Mores and Continueds">
							<p className={`mb-2 text-xs font-medium ${isDark ? 'text-slate-300' : 'text-stone-700'}`}>Dialogue Breaks</p>
							<InspectorRow isDark={isDark} label="Bottom of Page">
								<YesNoToggle
									isDark={isDark}
									value={documentLayout.dialogueBreaks.showMoreAtPageBottom}
									onChange={(value) =>
										onLayoutChange({
											dialogueBreaks: { ...documentLayout.dialogueBreaks, showMoreAtPageBottom: value },
										})
									}
								/>
							</InspectorRow>
							<input
								className={`${inputClass} mb-2 w-full`}
								value={documentLayout.dialogueBreaks.moreText}
								onChange={(event) =>
									onLayoutChange({
										dialogueBreaks: { ...documentLayout.dialogueBreaks, moreText: event.target.value },
									})
								}
							/>
							<InspectorRow isDark={isDark} label="Top of Next Page">
								<YesNoToggle
									isDark={isDark}
									value={documentLayout.dialogueBreaks.showContinuedAtPageTop}
									onChange={(value) =>
										onLayoutChange({
											dialogueBreaks: { ...documentLayout.dialogueBreaks, showContinuedAtPageTop: value },
										})
									}
								/>
							</InspectorRow>
							<input
								className={`${inputClass} mb-3 w-full`}
								value={documentLayout.dialogueBreaks.continuedText}
								onChange={(event) =>
									onLayoutChange({
										dialogueBreaks: { ...documentLayout.dialogueBreaks, continuedText: event.target.value },
									})
								}
							/>
							<InspectorRow isDark={isDark} label="Auto Character Continueds">
								<YesNoToggle
									isDark={isDark}
									value={documentLayout.dialogueBreaks.autoCharacterContinueds}
									onChange={(value) =>
										onLayoutChange({
											dialogueBreaks: { ...documentLayout.dialogueBreaks, autoCharacterContinueds: value },
										})
									}
								/>
							</InspectorRow>
						</CollapsibleSection>

						<CollapsibleSection isDark={isDark} defaultOpen={false} title="Document">
							<div className={`mb-3 ${sectionLabelClass}`}>
								<span>Revision Mode</span>
							</div>
							<div className="flex flex-wrap gap-2">
								{revisionColors.map((color) => (
									<button
										key={color}
										className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.14em] ${
											documentLayout.revisionColor === color
												? isDark
													? 'border-amber-500 bg-amber-950/40 text-amber-200'
													: 'border-amber-400 bg-amber-50 text-stone-900'
												: isDark
													? 'border-slate-600 bg-slate-800 text-slate-300'
													: 'border-stone-300 bg-white text-stone-600'
										}`}
										type="button"
										onClick={() => onLayoutChange({ revisionColor: color })}
									>
										{color}
									</button>
								))}
							</div>
						</CollapsibleSection>
					</>
				)}
			</div>
		</aside>
	);
}
