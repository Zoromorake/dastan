import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CharacterProfile, ScreenplayDocumentRecord, ScreenplayWorkspaceData, StructureTemplate } from '../../types';
import {
	GUIDE_ROOM_SYSTEM_PROMPT,
	GUIDE_STEP_COPY,
	GUIDE_STEP_LABELS,
	GUIDE_STEPS,
	LOGLINE_FIELD_COPY,
	SAVE_THE_CAT_BEAT_GUIDANCE,
	THREE_ACT_BEAT_GUIDANCE,
	type GuideStepId,
} from '../../content/guide-copy';
import { getFirstIncompleteGuideStep } from '../../utils/guide-progress';
import { createStructureBeatsFromTemplate } from '../../utils/story-structure';
import { loadAiSettings } from '../../utils/ai-settings';
import { hasAnyProviderConfigured } from '../../utils/ai-models';
import { createFreshFadeInContent } from '../../utils/scratch-template';

interface DevelopmentGuideProps {
	document: ScreenplayDocumentRecord;
	isDark: boolean;
	onWorkspaceChange: (workspace: ScreenplayWorkspaceData) => void;
	onContentChange: (content: ScreenplayDocumentRecord['content']) => void;
	onComplete: () => void;
	onExit: () => void;
}

interface LoglineFields {
	protagonist: string;
	want: string;
	obstacle: string;
	stakes: string;
}

function composeLogline(fields: LoglineFields): string {
	const parts = [fields.protagonist, fields.want, fields.obstacle, fields.stakes].map((part) => part.trim()).filter(Boolean);

	if (parts.length === 0) {
		return '';
	}

	return `When ${fields.protagonist.trim()}, they want ${fields.want.trim()}, but ${fields.obstacle.trim()} — and ${fields.stakes.trim()}.`;
}

async function askTheRoom(stepLabel: string, context: string): Promise<string | null> {
	const settings = loadAiSettings();

	if (!hasAnyProviderConfigured(settings)) {
		return null;
	}

	try {
		const response = await fetch(settings.chatApiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{ role: 'system', content: GUIDE_ROOM_SYSTEM_PROMPT },
					{ role: 'user', content: `Step: ${stepLabel}\nCurrent notes:\n${context}` },
				],
				provider: settings.defaultProvider,
				model: settings.defaultModel,
				apiKeys: settings.apiKeys,
				maxTokens: 120,
			}),
		});

		if (!response.ok) {
			return null;
		}

		const payload = (await response.json()) as { text?: string; content?: string };
		return (payload.text ?? payload.content ?? '').trim() || null;
	} catch {
		return null;
	}
}

export function DevelopmentGuide({
	document,
	isDark,
	onWorkspaceChange,
	onContentChange,
	onComplete,
	onExit,
}: DevelopmentGuideProps) {
	const workspace = document.workspace!;
	const initialStep = getFirstIncompleteGuideStep(workspace);
	const [step, setStep] = useState<GuideStepId>(initialStep);
	const [beatTemplate, setBeatTemplate] = useState<StructureTemplate>(
		workspace.development.structureTemplate === 'blank' ? 'save-the-cat' : workspace.development.structureTemplate,
	);
	const [loglineFields, setLoglineFields] = useState<LoglineFields>({
		protagonist: '',
		want: '',
		obstacle: '',
		stakes: '',
	});
	const [roomQuestions, setRoomQuestions] = useState<string | null>(null);
	const [roomLoading, setRoomLoading] = useState(false);

	const characters = useMemo(() => Object.values(workspace.characterProfiles), [workspace.characterProfiles]);
	const stepIndex = GUIDE_STEPS.indexOf(step);
	const copy = GUIDE_STEP_COPY[step];

	const patchWorkspace = useCallback(
		(patch: Partial<ScreenplayWorkspaceData>) => {
			onWorkspaceChange({ ...workspace, ...patch });
		},
		[onWorkspaceChange, workspace],
	);

	const persistLogline = useCallback(
		(fields: LoglineFields) => {
			patchWorkspace({
				development: {
					...workspace.development,
					basics: {
						...workspace.development.basics,
						logline: composeLogline(fields),
					},
				},
			});
		},
		[patchWorkspace, workspace.development],
	);

	const goNext = useCallback(() => {
		const next = GUIDE_STEPS[stepIndex + 1];

		if (!next) {
			return;
		}

		patchWorkspace({ guide: { active: true, furthestStep: next } });
		setStep(next);
		setRoomQuestions(null);
	}, [patchWorkspace, stepIndex]);

	const handleFinish = useCallback(() => {
		patchWorkspace({ guide: { active: false, furthestStep: 'finish' } });
		onContentChange(createFreshFadeInContent());
		onComplete();
	}, [onComplete, onContentChange, patchWorkspace]);

	const handleAskRoom = useCallback(async () => {
		setRoomLoading(true);
		const context = JSON.stringify({
			step,
			basics: workspace.development.basics,
			characters: workspace.characterProfiles,
			beats: workspace.development.structureBeats.map((beat) => ({ label: beat.label, summary: beat.summary })),
		});
		const response = await askTheRoom(GUIDE_STEP_LABELS[step], context);
		setRoomQuestions(response);
		setRoomLoading(false);
	}, [step, workspace]);

	return (
		<div className="fixed inset-0 z-[110] flex flex-col bg-background/95 backdrop-blur-sm">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
				<div>
					<p className="text-[10px] font-semibold tracking-[0.16em] text-gold uppercase">Development Room</p>
					<p className="text-sm text-muted-foreground">
						Step {stepIndex + 1} of {GUIDE_STEPS.length} · {GUIDE_STEP_LABELS[step]}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button size="sm" type="button" variant="outline" onClick={onExit}>
						Exit guide
					</Button>
				</div>
			</header>

			<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 sm:px-6">
				<div className="flex gap-1">
					{GUIDE_STEPS.map((guideStep, index) => (
						<div
							key={guideStep}
							className={cn('h-1 flex-1 rounded-full', index <= stepIndex ? 'bg-gold/70' : 'bg-muted')}
						/>
					))}
				</div>

				<div>
					<h1 className="text-xl font-semibold text-foreground">{copy.title}</h1>
					<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.guidance}</p>
				</div>

				{step === 'spark' ? (
					<textarea
						className="min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
						placeholder="One sentence that captures the heat of the idea…"
						value={workspace.development.basics.spark ?? ''}
						onChange={(event) =>
							patchWorkspace({
								development: {
									...workspace.development,
									basics: { ...workspace.development.basics, spark: event.target.value },
								},
							})
						}
					/>
				) : null}

				{step === 'logline' ? (
					<div className="grid gap-3">
						{(Object.keys(LOGLINE_FIELD_COPY) as Array<keyof LoglineFields>).map((field) => (
							<label key={field} className="grid gap-1 text-sm">
								<span className="font-medium capitalize">{field}</span>
								<span className="text-xs text-muted-foreground">{LOGLINE_FIELD_COPY[field]}</span>
								<Input
									value={loglineFields[field]}
									onChange={(event) => {
										const next = { ...loglineFields, [field]: event.target.value };
										setLoglineFields(next);
										persistLogline(next);
									}}
									onBlur={() => persistLogline(loglineFields)}
								/>
							</label>
						))}
					</div>
				) : null}

				{step === 'genre' ? (
					<div className="grid gap-3">
						<label className="grid gap-1 text-sm">
							<span className="font-medium">Genre</span>
							<Input
								value={workspace.development.basics.genre}
								onChange={(event) =>
									patchWorkspace({
										development: {
											...workspace.development,
											basics: { ...workspace.development.basics, genre: event.target.value },
										},
									})
								}
							/>
						</label>
						<label className="grid gap-1 text-sm">
							<span className="font-medium">Tone</span>
							<Input
								placeholder="e.g. tense, lyrical, dry"
								value={workspace.development.basics.tone ?? ''}
								onChange={(event) =>
									patchWorkspace({
										development: {
											...workspace.development,
											basics: { ...workspace.development.basics, tone: event.target.value },
										},
									})
								}
							/>
						</label>
						{[0, 1, 2].map((index) => (
							<label key={index} className="grid gap-1 text-sm">
								<span className="font-medium">Comparable film {index + 1}</span>
								<Input
									value={workspace.development.basics.comparableFilms?.[index] ?? ''}
									onChange={(event) => {
										const films = [...(workspace.development.basics.comparableFilms ?? ['', '', ''])];
										films[index] = event.target.value;
										patchWorkspace({
											development: {
												...workspace.development,
												basics: { ...workspace.development.basics, comparableFilms: films },
											},
										});
									}}
								/>
							</label>
						))}
					</div>
				) : null}

				{step === 'characters' ? (
					<div className="grid gap-4">
						{[0, 1, 2, 3].map((index) => {
							const profileId = Object.keys(workspace.characterProfiles)[index] ?? `guide-char-${index}`;
							const profile: CharacterProfile = workspace.characterProfiles[profileId] ?? {
								name: '',
								want: '',
								need: '',
								flaw: '',
							};

							return (
								<div key={profileId} className="rounded-xl border border-border p-3">
									<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										Character {index + 1}
									</p>
									<div className="grid gap-2 sm:grid-cols-2">
										{(['name', 'want', 'need', 'flaw'] as const).map((field) => (
											<label key={field} className="grid gap-1 text-sm">
												<span className="capitalize">{field}</span>
												<Input
													value={profile[field] ?? ''}
													onChange={(event) =>
														patchWorkspace({
															characterProfiles: {
																...workspace.characterProfiles,
																[profileId]: {
																	...profile,
																	[field]: event.target.value,
																},
															},
														})
													}
												/>
											</label>
										))}
									</div>
								</div>
							);
						})}
					</div>
				) : null}

				{step === 'beats' ? (
					<div className="grid gap-4">
						<div className="flex flex-wrap gap-2">
							{(['save-the-cat', 'three-act'] as StructureTemplate[]).map((template) => (
								<Button
									key={template}
									size="sm"
									type="button"
									variant={beatTemplate === template ? 'default' : 'outline'}
									onClick={() => {
										setBeatTemplate(template);
										patchWorkspace({
											development: {
												...workspace.development,
												structureTemplate: template,
												structureBeats: createStructureBeatsFromTemplate(template),
											},
										});
									}}
								>
									{template === 'save-the-cat' ? 'Save the Cat (15)' : 'Simple 8-beat three-act'}
								</Button>
							))}
						</div>
						<div className="grid gap-3">
							{workspace.development.structureBeats.map((beat) => {
								const guidance =
									beatTemplate === 'save-the-cat'
										? SAVE_THE_CAT_BEAT_GUIDANCE[beat.key]
										: THREE_ACT_BEAT_GUIDANCE[beat.key];

								return (
									<label key={beat.id} className="grid gap-1 rounded-xl border border-border p-3 text-sm">
										<span className="font-medium">{beat.label}</span>
										{guidance ? <span className="text-xs text-muted-foreground">{guidance}</span> : null}
										<textarea
											className="mt-1 min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
											value={beat.summary}
											onChange={(event) =>
												patchWorkspace({
													development: {
														...workspace.development,
														structureBeats: workspace.development.structureBeats.map((entry) =>
															entry.id === beat.id ? { ...entry, summary: event.target.value } : entry,
														),
													},
												})
											}
										/>
									</label>
								);
							})}
						</div>
					</div>
				) : null}

				{step === 'scenes' ? (
					<div className="grid gap-3">
						{(['Act I', 'Act II', 'Act III'] as const).map((label, index) => (
							<label key={label} className="grid gap-1 text-sm">
								<span className="font-medium">{label} — rough scenes</span>
								<textarea
									className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
									value={workspace.development.basics.actSummaries[index] ?? ''}
									onChange={(event) => {
										const actSummaries = [...workspace.development.basics.actSummaries] as [string, string, string];
										actSummaries[index] = event.target.value;
										patchWorkspace({
											development: {
												...workspace.development,
												basics: { ...workspace.development.basics, actSummaries },
											},
										});
									}}
								/>
							</label>
						))}
					</div>
				) : null}

				{step === 'finish' ? (
					<div className="rounded-2xl border border-gold/25 bg-gold/5 px-4 py-5 text-center">
						<p className="font-[family-name:var(--font-screenplay)] text-sm tracking-[0.12em] text-gold uppercase">
							You&apos;re ready. FADE IN.
						</p>
					</div>
				) : null}

				{roomQuestions ? (
					<div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm whitespace-pre-wrap text-muted-foreground">
						{roomQuestions}
					</div>
				) : null}
			</div>

			<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
				<Button disabled={roomLoading} size="sm" type="button" variant="outline" onClick={() => void handleAskRoom()}>
					{roomLoading ? 'Asking…' : 'Ask the room'}
				</Button>
				<div className="flex items-center gap-2">
					{stepIndex > 0 ? (
						<Button
							size="sm"
							type="button"
							variant="ghost"
							onClick={() => setStep(GUIDE_STEPS[stepIndex - 1]!)}
						>
							Back
						</Button>
					) : null}
					{step === 'logline' ? (
						<Button
							size="sm"
							type="button"
							onClick={() => {
								const logline = composeLogline(loglineFields);
								patchWorkspace({
									development: {
										...workspace.development,
										basics: { ...workspace.development.basics, logline },
									},
								});
								goNext();
							}}
						>
							Continue
						</Button>
					) : step === 'finish' ? (
						<Button size="sm" type="button" onClick={handleFinish}>
							Open the script
						</Button>
					) : (
						<Button size="sm" type="button" onClick={goNext}>
							Continue
						</Button>
					)}
				</div>
			</footer>
		</div>
	);
}
