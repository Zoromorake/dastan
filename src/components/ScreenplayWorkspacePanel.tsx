import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Search } from 'lucide-react';

import type { BeatBoardCard, CharacterProfile, LocationProfile, ScreenplayWorkspaceData } from '../types';
import type { SceneHeadingSummary, ScreenplayBlockText } from '../utils/screenplay-text';
import { getWorkspaceTheme } from '../utils/workspace-theme';

export type WorkspaceTab = 'Script' | 'Outline' | 'Beat Board' | 'Characters' | 'Locations' | 'Notes';

interface ScreenplayWorkspacePanelProps {
	activeTab: Exclude<WorkspaceTab, 'Script'>;
	scenes: SceneHeadingSummary[];
	blocks: ScreenplayBlockText[];
	workspace: ScreenplayWorkspaceData;
	resolvedTheme: 'light' | 'dark';
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
	scenes,
	blocks,
	workspace,
	resolvedTheme,
	onWorkspaceChange,
	onSceneSelect,
}: ScreenplayWorkspacePanelProps) {
	const isDark = resolvedTheme === 'dark';
	const theme = getWorkspaceTheme(isDark);
	const [characterQuery, setCharacterQuery] = useState('');
	const [notesView, setNotesView] = useState<'global' | 'scenes'>('global');

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

	if (activeTab === 'Outline') {
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

	if (activeTab === 'Beat Board') {
		return (
			<section className={`${theme.panel} p-5 sm:p-6`}>
				<PanelHeader
					chip={`${sceneBeats.length} cards`}
					subtitle="Reorder story beats and keep a bird's-eye view of the script."
					theme={theme}
					title="Beat Board"
				/>

				{sceneBeats.length === 0 ? (
					<p className={theme.empty}>
						No beats yet. Add scene headings and action blocks to generate cards automatically.
					</p>
				) : (
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
						{sceneBeats.map((scene, index) => {
							const parsed = parseSceneHeading(scene.heading);

							return (
								<article key={scene.id} className={`${theme.card} flex flex-col p-4`}>
									<div className="mb-3 flex items-center justify-between gap-2">
										<span className={theme.chip}>Beat {index + 1}</span>
										<div className="flex gap-1">
											<button
												aria-label="Move beat up"
												className={theme.button}
												disabled={index === 0}
												type="button"
												onClick={() => moveBeat(scene.id, -1)}
											>
												<ArrowUp size={14} />
											</button>
											<button
												aria-label="Move beat down"
												className={theme.button}
												disabled={index === sceneBeats.length - 1}
												type="button"
												onClick={() => moveBeat(scene.id, 1)}
											>
												<ArrowDown size={14} />
											</button>
										</div>
									</div>
									<button
										className={`mb-1 text-left text-sm font-semibold leading-snug ${theme.heading}`}
										type="button"
										onClick={() => handleSceneJump(scene.sceneIndex)}
									>
										{parsed.slugline}
									</button>
									<p className={`mb-3 text-xs ${theme.muted}`}>
										{parsed.location} · {parsed.timeOfDay}
									</p>
									<textarea
										className={`${theme.textarea} min-h-[7rem] flex-1`}
										placeholder="Beat summary..."
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

	if (activeTab === 'Characters') {
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

	if (activeTab === 'Locations') {
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
