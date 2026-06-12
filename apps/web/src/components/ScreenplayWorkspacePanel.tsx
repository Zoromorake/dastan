import { useMemo, useState, type DragEvent } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, LayoutGrid, List, Plus, Search } from 'lucide-react';

import type {
	BeatBoardCard,
	CharacterProfile,
	LocationProfile,
	ScreenplayWorkspaceData,
	StoryDevelopment,
	StructureTemplate,
} from '../types';
import type { WorkspacePanelTab } from '../types/workspace-navigation';
import type { SceneHeadingSummary, ScreenplayBlockText } from '../utils/screenplay-text';
import {
	createBlankStructureBeat,
	createStructureBeatsFromTemplate,
	mergeStructureBeatsWithTemplate,
	STRUCTURE_TEMPLATE_LABELS,
} from '../utils/story-structure';
import { getWorkspaceTheme } from '../utils/workspace-theme';

interface ScreenplayWorkspacePanelProps {
	activeTab: WorkspacePanelTab;
	documentTitle: string;
	scenes: SceneHeadingSummary[];
	blocks: ScreenplayBlockText[];
	workspace: ScreenplayWorkspaceData;
	resolvedTheme: 'light' | 'dark';
	onTitleChange: (title: string) => void;
	onWorkspaceChange: (workspace: Partial<ScreenplayWorkspaceData>) => void;
	onSceneSelect: (sceneIndex: number) => void;
}

interface CharacterStats {
	name: string;
	lines: number;
	words: number;
	scenes: number;
}

function normalizeCharacterName(value: string): string {
	return value.replace(/\(.*?\)/gu, '').trim().replace(/\s+/gu, ' ').toUpperCase();
}

function summarizeBeat(value: string): string {
	const normalized = value.replace(/\s+/gu, ' ').trim();

	if (normalized.length === 0) {
		return 'No beat summary yet. Add action lines below this scene heading.';
	}

	if (normalized.length <= 96) {
		return normalized;
	}

	return `${normalized.slice(0, 93)}...`;
}

function parseSceneHeading(value: string): { slugline: string; location: string; timeOfDay: string; intro: string } {
	const slugline = value.trim();
	const introMatch = slugline.match(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.)/iu);
	const intro = introMatch?.[1] ?? '';
	const withoutPrefix = slugline.replace(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.)\s*/iu, '');
	const [location, timeOfDay] = withoutPrefix.split(/\s-\s/u).map((token) => token.trim());

	return {
		slugline: slugline.length > 0 ? slugline : 'UNTITLED SCENE',
		intro,
		location: location && location.length > 0 ? location : 'Unspecified location',
		timeOfDay: timeOfDay && timeOfDay.length > 0 ? timeOfDay : 'Unspecified time',
	};
}

function buildDefaultBeatBoard(scenes: SceneHeadingSummary[], blocks: ScreenplayBlockText[]): BeatBoardCard[] {
	const beats: BeatBoardCard[] = [];
	let currentScene: { sceneIndex: number; heading: string } | null = null;
	const beatBuffer: string[] = [];

	const flush = () => {
		if (currentScene === null) {
			return;
		}

		beats.push({
			id: `scene-${currentScene.sceneIndex}`,
			sceneIndex: currentScene.sceneIndex,
			heading: currentScene.heading,
			beat: summarizeBeat(beatBuffer.join(' ')),
			order: beats.length,
		});
		beatBuffer.length = 0;
	};

	for (const [index, block] of blocks.entries()) {
		if (block.type === 'scene_heading') {
			flush();
			const fallbackHeading = block.text.length > 0 ? block.text : `SCENE ${beats.length + 1}`;
			currentScene = { sceneIndex: index, heading: fallbackHeading };
			continue;
		}

		if (currentScene === null) {
			continue;
		}

		if ((block.type === 'action' || block.type === 'dialogue') && beatBuffer.join(' ').length < 220) {
			beatBuffer.push(block.text);
		}
	}

	flush();
	return beats;
}

function PanelHeader({
	title,
	subtitle,
	chip,
	theme,
}: {
	title: string;
	subtitle?: string;
	chip?: string;
	theme: ReturnType<typeof getWorkspaceTheme>;
}) {
	return (
		<div className="mb-5 flex flex-wrap items-end justify-between gap-3">
			<div>
				<h2 className={`text-lg font-semibold ${theme.heading}`}>{title}</h2>
				{subtitle ? <p className={`mt-0.5 text-sm ${theme.muted}`}>{subtitle}</p> : null}
			</div>
			{chip ? <span className={theme.chip}>{chip}</span> : null}
		</div>
	);
}

function StatTile({
	label,
	value,
	theme,
}: {
	label: string;
	value: string | number;
	theme: ReturnType<typeof getWorkspaceTheme>;
}) {
	return (
		<div className={theme.stat}>
			<p className={`text-[10px] uppercase tracking-[0.16em] ${theme.muted}`}>{label}</p>
			<p className={`mt-1 text-xl font-semibold tabular-nums ${theme.heading}`}>{value}</p>
		</div>
	);
}

export function ScreenplayWorkspacePanel({
	activeTab,
	documentTitle,
	scenes,
	blocks,
	workspace,
	resolvedTheme,
	onTitleChange,
	onWorkspaceChange,
	onSceneSelect,
}: ScreenplayWorkspacePanelProps) {
	const isDark = resolvedTheme === 'dark';
	const theme = getWorkspaceTheme(isDark);
	const development = workspace.development;
	const [characterQuery, setCharacterQuery] = useState('');
	const [notesView, setNotesView] = useState<'global' | 'scenes'>('global');
	const [draggingBeatId, setDraggingBeatId] = useState<string | null>(null);
	const [draggingStructureBeatId, setDraggingStructureBeatId] = useState<string | null>(null);

	const structureBeats = useMemo(() => {
		const beats =
			development.structureBeats.length > 0
				? development.structureBeats
				: createStructureBeatsFromTemplate(development.structureTemplate);

		return [...beats].sort((left, right) => left.order - right.order);
	}, [development.structureBeats, development.structureTemplate]);

	const updateDevelopment = (patch: Partial<StoryDevelopment>) => {
		onWorkspaceChange({
			development: {
				...development,
				...patch,
			},
		});
	};

	const updateStructureBeat = (beatId: string, summary: string) => {
		updateDevelopment({
			structureBeats: structureBeats.map((beat) => (beat.id === beatId ? { ...beat, summary } : beat)),
		});
	};

	const reorderStructureBeats = (sourceId: string, targetId: string) => {
		if (sourceId === targetId) {
			return;
		}

		const ordered = [...structureBeats];
		const sourceIndex = ordered.findIndex((beat) => beat.id === sourceId);
		const targetIndex = ordered.findIndex((beat) => beat.id === targetId);

		if (sourceIndex < 0 || targetIndex < 0) {
			return;
		}

		const [moved] = ordered.splice(sourceIndex, 1);
		if (!moved) {
			return;
		}

		ordered.splice(targetIndex, 0, moved);
		updateDevelopment({
			structureBeats: ordered.map((beat, order) => ({ ...beat, order })),
		});
	};

	const moveStructureBeat = (beatId: string, direction: -1 | 1) => {
		const ordered = [...structureBeats];
		const index = ordered.findIndex((beat) => beat.id === beatId);

		if (index < 0) {
			return;
		}

		const targetIndex = index + direction;

		if (targetIndex < 0 || targetIndex >= ordered.length) {
			return;
		}

		const reordered = [...ordered];
		const current = reordered[index];
		const swap = reordered[targetIndex];

		if (!current || !swap) {
			return;
		}

		reordered[index] = swap;
		reordered[targetIndex] = current;
		updateDevelopment({
			structureBeats: reordered.map((beat, order) => ({ ...beat, order })),
		});
	};

	const applyStructureTemplate = (template: StructureTemplate) => {
		const nextBeats =
			template === 'blank' && development.structureBeats.length === 0
				? [createBlankStructureBeat(0)]
				: mergeStructureBeatsWithTemplate(development.structureBeats, template);

		updateDevelopment({
			structureTemplate: template,
			structureBeats: nextBeats,
		});
	};

	const sceneBeats = useMemo(() => {
		if (workspace.beatBoard.length > 0) {
			return [...workspace.beatBoard].sort((left, right) => left.order - right.order);
		}

		return buildDefaultBeatBoard(scenes, blocks);
	}, [blocks, scenes, workspace.beatBoard]);

	const characterStats = useMemo(() => {
		const stats = new Map<string, CharacterStats>();
		const characterScenes = new Map<string, Set<number>>();
		let activeCharacter = '';
		let activeScene = -1;

		for (const block of blocks) {
			if (block.type === 'scene_heading') {
				activeScene += 1;
			}

			if (block.type === 'character') {
				activeCharacter = normalizeCharacterName(block.text);

				if (activeCharacter.length === 0) {
					continue;
				}

				if (!stats.has(activeCharacter)) {
					stats.set(activeCharacter, {
						name: activeCharacter,
						lines: 0,
						words: 0,
						scenes: 0,
					});
					characterScenes.set(activeCharacter, new Set<number>());
				}

				continue;
			}

			if (block.type === 'dialogue' && activeCharacter.length > 0) {
				const stat = stats.get(activeCharacter);

				if (!stat) {
					continue;
				}

				const wordCount = block.text.trim().length === 0 ? 0 : block.text.trim().split(/\s+/u).length;
				stat.lines += 1;
				stat.words += wordCount;

				if (activeScene >= 0) {
					characterScenes.get(activeCharacter)?.add(activeScene);
				}
			}
		}

		const result = Array.from(stats.values()).map((entry) => ({
			...entry,
			scenes: characterScenes.get(entry.name)?.size ?? 0,
		}));

		result.sort((left, right) => {
			if (right.lines === left.lines) {
				return right.words - left.words;
			}

			return right.lines - left.lines;
		});

		return result;
	}, [blocks]);

	const filteredCharacters = useMemo(() => {
		const query = characterQuery.trim().toUpperCase();

		if (query.length === 0) {
			return characterStats;
		}

		return characterStats.filter((character) => character.name.includes(query));
	}, [characterQuery, characterStats]);

	const locationStats = useMemo(() => {
		const stats = new Map<string, { location: string; count: number; time: string }>();

		for (const scene of scenes) {
			const parsed = parseSceneHeading(scene.text);
			const existing = stats.get(parsed.location);

			if (existing) {
				existing.count += 1;
				continue;
			}

			stats.set(parsed.location, {
				location: parsed.location,
				count: 1,
				time: parsed.timeOfDay,
			});
		}

		return Array.from(stats.values()).sort((left, right) => right.count - left.count);
	}, [scenes]);

	const locationScenes = useMemo(() => {
		const map = new Map<string, Array<{ index: number; slugline: string; timeOfDay: string }>>();

		for (const scene of scenes) {
			const parsed = parseSceneHeading(scene.text);
			const list = map.get(parsed.location) ?? [];
			list.push({ index: scene.index, slugline: parsed.slugline, timeOfDay: parsed.timeOfDay });
			map.set(parsed.location, list);
		}

		return map;
	}, [scenes]);

	const outlineStats = useMemo(() => {
		let interior = 0;
		let exterior = 0;

		for (const scene of scenes) {
			const normalized = scene.text.trim().toUpperCase();

			if (normalized.startsWith('INT.')) {
				interior += 1;
			} else if (normalized.startsWith('EXT.')) {
				exterior += 1;
			}
		}

		return { total: scenes.length, interior, exterior };
	}, [scenes]);

	const characterSummary = useMemo(() => {
		const totalLines = characterStats.reduce((sum, entry) => sum + entry.lines, 0);
		const lead = characterStats[0];

		return {
			count: characterStats.length,
			totalLines,
			leadName: lead?.name ?? '—',
			leadLines: lead?.lines ?? 0,
		};
	}, [characterStats]);

	const updateBeat = (cardId: string, beat: string) => {
		const nextBeatBoard = sceneBeats.map((card) => (card.id === cardId ? { ...card, beat } : card));
		onWorkspaceChange({ beatBoard: nextBeatBoard });
	};

	const reorderBeatBoard = (sourceId: string, targetId: string) => {
		if (sourceId === targetId) {
			return;
		}

		const ordered = [...sceneBeats];
		const sourceIndex = ordered.findIndex((card) => card.id === sourceId);
		const targetIndex = ordered.findIndex((card) => card.id === targetId);

		if (sourceIndex < 0 || targetIndex < 0) {
			return;
		}

		const [moved] = ordered.splice(sourceIndex, 1);
		ordered.splice(targetIndex, 0, moved);

		onWorkspaceChange({
			beatBoard: ordered.map((card, order) => ({ ...card, order })),
		});
	};

	const handleBeatDragStart = (event: DragEvent<HTMLElement>, cardId: string) => {
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', cardId);
		setDraggingBeatId(cardId);
	};

	const handleBeatDragOver = (event: DragEvent<HTMLElement>) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	};

	const handleBeatDrop = (event: DragEvent<HTMLElement>, targetId: string) => {
		event.preventDefault();
		const sourceId = event.dataTransfer.getData('text/plain') || draggingBeatId;

		if (sourceId) {
			reorderBeatBoard(sourceId, targetId);
		}

		setDraggingBeatId(null);
	};

	const moveBeat = (cardId: string, direction: -1 | 1) => {
		const ordered = [...sceneBeats];
		const index = ordered.findIndex((card) => card.id === cardId);

		if (index < 0) {
			return;
		}

		const targetIndex = index + direction;

		if (targetIndex < 0 || targetIndex >= ordered.length) {
			return;
		}

		const reordered = [...ordered];
		const [moved] = reordered.splice(index, 1);
		reordered.splice(targetIndex, 0, moved);

		onWorkspaceChange({
			beatBoard: reordered.map((card, order) => ({ ...card, order })),
		});
	};

	const updateCharacterProfile = (name: string, profile: Partial<CharacterProfile>) => {
		onWorkspaceChange({
			characterProfiles: {
				...workspace.characterProfiles,
				[name]: {
					...workspace.characterProfiles[name],
					...profile,
					name,
				},
			},
		});
	};

	const updateLocationProfile = (location: string, profile: Partial<LocationProfile>) => {
		onWorkspaceChange({
			locationProfiles: {
				...workspace.locationProfiles,
				[location]: {
					...workspace.locationProfiles[location],
					...profile,
					location,
				},
			},
		});
	};

	const handleSceneJump = (sceneIndex: number) => {
		onSceneSelect(sceneIndex);
	};

	if (activeTab === 'basics') {
		const { basics } = development;

		return (
			<section className={`${theme.panel} p-5 sm:p-6`}>
				<PanelHeader
					subtitle="Pitch package — title, logline, synopsis, and act summaries."
					theme={theme}
					title="Story Basics"
				/>

				<div className="space-y-4">
					<label className="block space-y-1.5">
						<span className={`text-xs font-medium uppercase tracking-[0.12em] ${theme.muted}`}>Title</span>
						<input
							className={`${theme.input} w-full`}
							placeholder="Untitled"
							value={documentTitle}
							onChange={(event) => onTitleChange(event.target.value)}
						/>
					</label>
					<label className="block space-y-1.5">
						<span className={`text-xs font-medium uppercase tracking-[0.12em] ${theme.muted}`}>Genre</span>
						<input
							className={`${theme.input} w-full`}
							placeholder="Thriller, drama, sci-fi…"
							value={basics.genre}
							onChange={(event) =>
								updateDevelopment({
									basics: { ...basics, genre: event.target.value },
								})
							}
						/>
					</label>
					<label className="block space-y-1.5">
						<span className={`text-xs font-medium uppercase tracking-[0.12em] ${theme.muted}`}>Logline</span>
						<textarea
							className={theme.textarea}
							placeholder="One sentence: protagonist, goal, conflict, stakes."
							rows={2}
							value={basics.logline}
							onChange={(event) =>
								updateDevelopment({
									basics: { ...basics, logline: event.target.value },
								})
							}
						/>
					</label>
					<label className="block space-y-1.5">
						<span className={`text-xs font-medium uppercase tracking-[0.12em] ${theme.muted}`}>Synopsis</span>
						<textarea
							className={theme.textarea}
							placeholder="1–3 paragraphs on the full story arc."
							rows={5}
							value={basics.synopsis}
							onChange={(event) =>
								updateDevelopment({
									basics: { ...basics, synopsis: event.target.value },
								})
							}
						/>
					</label>
					{(['Act I — Setup', 'Act II — Confrontation', 'Act III — Resolution'] as const).map((actLabel, index) => (
						<label key={actLabel} className="block space-y-1.5">
							<span className={`text-xs font-medium uppercase tracking-[0.12em] ${theme.muted}`}>{actLabel}</span>
							<textarea
								className={theme.textarea}
								placeholder={`Summary of ${actLabel.toLowerCase()}…`}
								rows={3}
								value={basics.actSummaries[index]}
								onChange={(event) => {
									const nextActs = [...basics.actSummaries] as [string, string, string];
									nextActs[index] = event.target.value;
									updateDevelopment({
										basics: { ...basics, actSummaries: nextActs },
									});
								}}
							/>
						</label>
					))}
				</div>
			</section>
		);
	}

	if (activeTab === 'structure') {
		return (
			<section className={`${theme.panel} p-5 sm:p-6`}>
				<PanelHeader
					chip={STRUCTURE_TEMPLATE_LABELS[development.structureTemplate]}
					subtitle="Pick a structure template and flesh out each story beat."
					theme={theme}
					title="Story Structure"
				/>

				<div className="mb-5 flex flex-wrap gap-2">
					{(Object.keys(STRUCTURE_TEMPLATE_LABELS) as StructureTemplate[]).map((template) => (
						<button
							key={template}
							className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
								development.structureTemplate === template
									? isDark
										? 'border-primary/50 bg-primary/15 text-primary'
										: 'border-amber-300 bg-amber-50 text-amber-900'
									: theme.button
							}`}
							type="button"
							onClick={() => applyStructureTemplate(template)}
						>
							{STRUCTURE_TEMPLATE_LABELS[template]}
						</button>
					))}
				</div>

				<div className="space-y-3">
					{structureBeats.map((beat, index) => (
						<article key={beat.id} className={`${theme.card} p-4`}>
							<div className="mb-2 flex flex-wrap items-center gap-2">
								<span className={theme.chip}>{index + 1}</span>
								<span className={`text-sm font-semibold ${theme.heading}`}>{beat.label}</span>
								{beat.pageHint ? <span className={`text-xs ${theme.muted}`}>· {beat.pageHint}</span> : null}
							</div>
							<textarea
								className={theme.textarea}
								placeholder="What happens at this beat?"
								rows={2}
								value={beat.summary}
								onChange={(event) => updateStructureBeat(beat.id, event.target.value)}
							/>
						</article>
					))}
				</div>
			</section>
		);
	}

	if (activeTab === 'beats') {
		const beatsViewMode = development.beatsViewMode;

		return (
			<section className={`${theme.panel} p-5 sm:p-6`}>
				<PanelHeader
					chip={`${structureBeats.length} beats`}
					subtitle="Macro story beats — reorder and summarize before breaking into scenes."
					theme={theme}
					title="Beat Board"
				/>

				<div
					className={`mb-5 inline-flex rounded-xl border p-1 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-stone-200 bg-stone-50'}`}
				>
					<button
						className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
							beatsViewMode === 'board'
								? isDark
									? 'bg-slate-700 text-slate-100'
									: 'bg-white text-stone-900 shadow-sm'
								: theme.muted
						}`}
						type="button"
						onClick={() => updateDevelopment({ beatsViewMode: 'board' })}
					>
						<LayoutGrid size={14} />
						Board
					</button>
					<button
						className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
							beatsViewMode === 'list'
								? isDark
									? 'bg-slate-700 text-slate-100'
									: 'bg-white text-stone-900 shadow-sm'
								: theme.muted
						}`}
						type="button"
						onClick={() => updateDevelopment({ beatsViewMode: 'list' })}
					>
						<List size={14} />
						List
					</button>
				</div>

				{development.structureTemplate === 'blank' ? (
					<button
						className={`mb-4 inline-flex items-center gap-1.5 ${theme.button}`}
						type="button"
						onClick={() =>
							updateDevelopment({
								structureBeats: [...structureBeats, createBlankStructureBeat(structureBeats.length)],
							})
						}
					>
						<Plus size={14} />
						Add beat
					</button>
				) : null}

				{structureBeats.length === 0 ? (
					<p className={theme.empty}>Choose a structure template in Structure, or add custom beats.</p>
				) : beatsViewMode === 'board' ? (
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
						{structureBeats.map((beat, index) => (
							<article
								key={beat.id}
								className={`${theme.card} flex flex-col p-4 ${draggingStructureBeatId === beat.id ? 'opacity-60' : ''}`}
								draggable
								onDragEnd={() => setDraggingStructureBeatId(null)}
								onDragOver={(event) => event.preventDefault()}
								onDragStart={(event) => {
									event.dataTransfer.setData('text/plain', beat.id);
									setDraggingStructureBeatId(beat.id);
								}}
								onDrop={(event) => {
									event.preventDefault();
									const sourceId = event.dataTransfer.getData('text/plain') || draggingStructureBeatId;
									if (sourceId) {
										reorderStructureBeats(sourceId, beat.id);
									}
									setDraggingStructureBeatId(null);
								}}
							>
								<div className="mb-3 flex items-center justify-between gap-2">
									<span className={theme.chip}>{beat.label}</span>
									<div className="flex gap-1">
										<button
											aria-label="Move beat up"
											className={theme.button}
											disabled={index === 0}
											type="button"
											onClick={() => moveStructureBeat(beat.id, -1)}
										>
											<ArrowUp size={14} />
										</button>
										<button
											aria-label="Move beat down"
											className={theme.button}
											disabled={index === structureBeats.length - 1}
											type="button"
											onClick={() => moveStructureBeat(beat.id, 1)}
										>
											<ArrowDown size={14} />
										</button>
									</div>
								</div>
								{beat.pageHint ? <p className={`mb-2 text-xs ${theme.muted}`}>{beat.pageHint}</p> : null}
								<textarea
									className={`${theme.textarea} min-h-[7rem] flex-1`}
									placeholder="Beat summary..."
									value={beat.summary}
									onChange={(event) => updateStructureBeat(beat.id, event.target.value)}
								/>
							</article>
						))}
					</div>
				) : (
					<div className="space-y-2">
						{structureBeats.map((beat, index) => (
							<article key={beat.id} className={`${theme.card} p-4`}>
								<div className="mb-2 flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<span className={theme.chip}>{index + 1}</span>
										<span className={`text-sm font-semibold ${theme.heading}`}>{beat.label}</span>
									</div>
									<div className="flex gap-1">
										<button
											aria-label="Move beat up"
											className={theme.button}
											disabled={index === 0}
											type="button"
											onClick={() => moveStructureBeat(beat.id, -1)}
										>
											<ArrowUp size={14} />
										</button>
										<button
											aria-label="Move beat down"
											className={theme.button}
											disabled={index === structureBeats.length - 1}
											type="button"
											onClick={() => moveStructureBeat(beat.id, 1)}
										>
											<ArrowDown size={14} />
										</button>
									</div>
								</div>
								<textarea
									className={theme.textarea}
									placeholder="Beat summary..."
									rows={2}
									value={beat.summary}
									onChange={(event) => updateStructureBeat(beat.id, event.target.value)}
								/>
							</article>
						))}
					</div>
				)}
			</section>
		);
	}

	if (activeTab === 'treatment') {
		return (
			<section className={`${theme.panel} p-5 sm:p-6`}>
				<PanelHeader
					subtitle="Prose narrative of the story — tone, character arcs, and major moments."
					theme={theme}
					title="Treatment"
				/>
				<textarea
					className={`${theme.textarea} min-h-[28rem] font-serif text-base leading-7`}
					placeholder="Write your treatment in present tense. Describe how the film reads from opening to final image…"
					value={development.treatment}
					onChange={(event) => updateDevelopment({ treatment: event.target.value })}
				/>
			</section>
		);
	}

	if (activeTab === 'outline') {
		return (
			<section className={`${theme.panel} p-5 sm:p-6`}>
				<PanelHeader
					chip={`${outlineStats.total} scenes`}
					subtitle="Scene-by-scene beats with quick jumps into the script."
					theme={theme}
					title="Scene Outline"
				/>

				{sceneBeats.length > 0 ? (
					<div className="mb-5 grid grid-cols-3 gap-3">
						<StatTile label="Scenes" theme={theme} value={outlineStats.total} />
						<StatTile label="Interior" theme={theme} value={outlineStats.interior} />
						<StatTile label="Exterior" theme={theme} value={outlineStats.exterior} />
					</div>
				) : null}

				{sceneBeats.length === 0 ? (
					<p className={theme.empty}>
						No scene headings detected yet. Add a slugline like INT. OFFICE - DAY in Script view.
					</p>
				) : (
					<div className="space-y-3">
						{sceneBeats.map((scene, index) => {
							const parsed = parseSceneHeading(scene.heading);

							return (
								<article key={scene.id} className={`${theme.card} p-4 transition ${theme.cardHover}`}>
									<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
										<div className="flex flex-wrap items-center gap-2">
											<span className={theme.chip}>Scene {index + 1}</span>
											{parsed.intro ? <span className={theme.chip}>{parsed.intro}</span> : null}
											<span className={`text-xs ${theme.muted}`}>{parsed.location}</span>
											<span className={`text-xs ${theme.muted}`}>· {parsed.timeOfDay}</span>
										</div>
										<button
											className={`inline-flex items-center gap-1 text-xs font-medium ${theme.buttonAccent}`}
											type="button"
											onClick={() => handleSceneJump(scene.sceneIndex)}
										>
											Open in script
											<ChevronRight size={14} />
										</button>
									</div>
									<button
										className={`mb-2 block text-left text-sm font-semibold ${theme.heading}`}
										type="button"
										onClick={() => handleSceneJump(scene.sceneIndex)}
									>
										{parsed.slugline}
									</button>
									<textarea
										className={theme.textarea}
										placeholder="What happens in this scene?"
										rows={3}
										value={scene.beat}
										onChange={(event) => updateBeat(scene.id, event.target.value)}
									/>
								</article>
							);
						})}
					</div>
				)}
			</section>
		);
	}

	if (activeTab === 'characters') {
		return (
			<section className={`${theme.panel} p-5 sm:p-6`}>
				<PanelHeader
					chip={`${characterSummary.count} speaking`}
					subtitle="Dialogue stats plus casting and arc notes."
					theme={theme}
					title="Characters"
				/>

				{characterStats.length > 0 ? (
					<div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
						<StatTile label="Characters" theme={theme} value={characterSummary.count} />
						<StatTile label="Dialogue lines" theme={theme} value={characterSummary.totalLines} />
						<StatTile label="Most lines" theme={theme} value={characterSummary.leadName} />
						<StatTile label="Lead count" theme={theme} value={characterSummary.leadLines} />
					</div>
				) : null}

				{characterStats.length > 0 ? (
					<label className={`mb-4 flex items-center gap-2 ${theme.input}`}>
						<Search className={theme.muted} size={16} />
						<input
							className="w-full bg-transparent outline-none"
							placeholder="Search characters..."
							value={characterQuery}
							onChange={(event) => setCharacterQuery(event.target.value)}
						/>
					</label>
				) : null}

				{characterStats.length === 0 ? (
					<p className={theme.empty}>No character cues with dialogue yet.</p>
				) : filteredCharacters.length === 0 ? (
					<p className={theme.empty}>No characters match your search.</p>
				) : (
					<div className="space-y-3">
						{filteredCharacters.map((character) => {
							const profile = workspace.characterProfiles[character.name] ?? { name: character.name };

							return (
								<article key={character.name} className={`${theme.card} p-4`}>
									<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
										<h3 className={`font-semibold ${theme.heading}`}>{character.name}</h3>
										<div className={`flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] ${theme.muted}`}>
											<span>{character.scenes} scenes</span>
											<span>{character.lines} lines</span>
											<span>{character.words} words</span>
										</div>
									</div>
									<div className="grid gap-3 md:grid-cols-2">
										<input
											className={theme.input}
											placeholder="Age / type"
											value={profile.age ?? ''}
											onChange={(event) => updateCharacterProfile(character.name, { age: event.target.value })}
										/>
										<input
											className={theme.input}
											placeholder="Arc / role"
											value={profile.arc ?? ''}
											onChange={(event) => updateCharacterProfile(character.name, { arc: event.target.value })}
										/>
									</div>
									<textarea
										className={`${theme.textarea} mt-3`}
										placeholder="Casting notes, backstory, relationships..."
										rows={3}
										value={profile.notes ?? ''}
										onChange={(event) => updateCharacterProfile(character.name, { notes: event.target.value })}
									/>
								</article>
							);
						})}
					</div>
				)}
			</section>
		);
	}

	if (activeTab === 'locations') {
		return (
			<section className={`${theme.panel} p-5 sm:p-6`}>
				<PanelHeader
					chip={`${locationStats.length} locations`}
					subtitle="Track sets, scene counts, and location notes."
					theme={theme}
					title="Locations"
				/>

				{locationStats.length === 0 ? (
					<p className={theme.empty}>
						No locations detected. Scene headings should look like INT. KITCHEN - NIGHT.
					</p>
				) : (
					<div className="space-y-3">
						{locationStats.map((location) => {
							const profile = workspace.locationProfiles[location.location] ?? { location: location.location };
							const scenesForLocation = locationScenes.get(location.location) ?? [];

							return (
								<article key={location.location} className={`${theme.card} p-4`}>
									<div className="mb-3 flex flex-wrap items-start justify-between gap-3">
										<div>
											<h3 className={`font-semibold ${theme.heading}`}>{location.location}</h3>
											<p className={`mt-1 text-xs uppercase tracking-[0.14em] ${theme.muted}`}>
												{location.count} scene{location.count === 1 ? '' : 's'} · Common time: {location.time}
											</p>
										</div>
									</div>
									<input
										className={`${theme.input} mb-3 w-full`}
										placeholder="Description / look / geography"
										value={profile.description ?? ''}
										onChange={(event) => updateLocationProfile(location.location, { description: event.target.value })}
									/>
									<textarea
										className={theme.textarea}
										placeholder="Set dressing, props, geography notes..."
										rows={3}
										value={profile.notes ?? ''}
										onChange={(event) => updateLocationProfile(location.location, { notes: event.target.value })}
									/>
									{scenesForLocation.length > 0 ? (
										<div className={`mt-4 border-t pt-3 ${theme.divider}`}>
											<p className={`mb-2 text-[10px] uppercase tracking-[0.16em] ${theme.muted}`}>Scenes here</p>
											<ul className="space-y-1.5">
												{scenesForLocation.map((scene) => (
													<li key={scene.index}>
														<button
															className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-stone-100'}`}
															type="button"
															onClick={() => handleSceneJump(scene.index)}
														>
															<span className={theme.heading}>{scene.slugline}</span>
															<span className={`shrink-0 text-xs ${theme.muted}`}>{scene.timeOfDay}</span>
														</button>
													</li>
												))}
											</ul>
										</div>
									) : null}
								</article>
							);
						})}
					</div>
				)}
			</section>
		);
	}

	const sceneNotesCount = Object.values(workspace.sceneNotes).filter((note) => note.trim().length > 0).length;

	return (
		<section className={`${theme.panel} p-5 sm:p-6`}>
			<PanelHeader
				chip={sceneNotesCount > 0 ? `${sceneNotesCount} scene notes` : 'Writer notes'}
				subtitle="Global script notes and per-scene reminders."
				theme={theme}
				title="Notes"
			/>

			<div
				className={`mb-5 inline-flex rounded-xl border p-1 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-stone-200 bg-stone-50'}`}
			>
				<button
					className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
						notesView === 'global'
							? isDark
								? 'bg-slate-700 text-slate-100'
								: 'bg-white text-stone-900 shadow-sm'
							: theme.muted
					}`}
					type="button"
					onClick={() => setNotesView('global')}
				>
					Global
				</button>
				<button
					className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
						notesView === 'scenes'
							? isDark
								? 'bg-slate-700 text-slate-100'
								: 'bg-white text-stone-900 shadow-sm'
							: theme.muted
					}`}
					type="button"
					onClick={() => setNotesView('scenes')}
				>
					Per scene ({scenes.length})
				</button>
			</div>

			{notesView === 'global' ? (
				<textarea
					aria-label="Writer notes"
					className={`${theme.textarea} min-h-[20rem]`}
					placeholder="Outline character arcs, unresolved props, rewrites, and reminders..."
					value={workspace.globalNotes}
					onChange={(event) => onWorkspaceChange({ globalNotes: event.target.value })}
				/>
			) : scenes.length === 0 ? (
				<p className={theme.empty}>Add scene headings in Script view to attach per-scene notes.</p>
			) : (
				<div className="space-y-3">
					{scenes.map((scene, index) => {
						const parsed = parseSceneHeading(scene.text);
						const noteValue = workspace.sceneNotes[scene.index] ?? '';

						return (
							<label key={scene.index} className={`block ${theme.card} p-4`}>
								<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
									<div className="flex flex-wrap items-center gap-2">
										<span className={theme.chip}>Scene {index + 1}</span>
										<span className={`text-sm font-medium ${theme.heading}`}>{parsed.slugline}</span>
									</div>
									<button
										className={`text-xs font-medium ${theme.buttonAccent}`}
										type="button"
										onClick={() => handleSceneJump(scene.index)}
									>
										Open in script
									</button>
								</div>
								<textarea
									className={theme.textarea}
									placeholder="Scene-specific notes..."
									rows={2}
									value={noteValue}
									onChange={(event) =>
										onWorkspaceChange({
											sceneNotes: {
												...workspace.sceneNotes,
												[scene.index]: event.target.value,
											},
										})
									}
								/>
							</label>
						);
					})}
				</div>
			)}
		</section>
	);
}
