import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Pin, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '../ConfirmDialog';
import { HubEmptyMark } from '../hub/HubEmptyMark';
import { getHubTheme } from '../../utils/hub-theme';
import {
	createCodexItem,
	deleteCodexItem,
	listAllCodexItems,
	saveCodexItem,
	type CodexItem,
	type CodexScope,
	type CodexStyle,
	type CreateCodexInput,
} from '../../utils/codex-storage';
import { notifyCodexChanged } from '../../utils/codex-events';
import { groupStylesByDomain, isCodexStyle } from '../../utils/codex-format';
import { chunkMarkdownByHeadings, parseCodexImportFile } from '../../utils/codex-import';
import { labelAppliesWhen } from '../../utils/codex-applies-when';
import type { ScreenplayProjectRecord } from '../../types';
import {
	CodexEditorForm,
	emptyCodexForm,
	formFromCodexItem,
	parseTagList,
	type CodexFormState,
} from '../codex/CodexEditorForm';

interface HubCodexPanelProps {
	isDark: boolean;
	projects: ScreenplayProjectRecord[];
	onOpenCapture?: () => void;
}

type TypeFilter = 'all' | 'style' | 'reference';
type ScopeFilter = 'all' | CodexScope;

function scopeLabel(item: CodexItem, projects: ScreenplayProjectRecord[]): string {
	if (item.scope === 'global') {
		return 'Global';
	}
	if (item.scope === 'project') {
		const project = projects.find((p) => p.id === item.projectId);
		return project?.title ? `Project · ${project.title}` : 'Project';
	}
	return 'Script';
}

function formToCreateInput(form: CodexFormState): CreateCodexInput | null {
	const tags = parseTagList(form.tags);

	if (form.type === 'style') {
		if (!form.instinct.trim()) {
			return null;
		}
		return {
			type: 'style',
			title: form.title.trim() || undefined,
			content: form.content,
			scope: form.scope,
			projectId: form.scope === 'project' ? form.projectId : undefined,
			documentId: form.scope === 'document' ? form.documentId : undefined,
			tags,
			pinned: form.pinned,
			domain: form.domain,
			appliesWhen: form.appliesWhen,
			instinct: form.instinct,
			rationale: form.rationale || undefined,
			exemplars: parseTagList(form.exemplars),
		};
	}

	if (!form.title.trim() && !form.content.trim()) {
		return null;
	}

	const imported = chunkMarkdownByHeadings(form.content);

	return {
		type: 'reference',
		title: form.title.trim() || imported.suggestedTitle,
		content: form.content,
		scope: form.scope,
		projectId: form.scope === 'project' ? form.projectId : undefined,
		documentId: form.scope === 'document' ? form.documentId : undefined,
		tags,
		pinned: form.pinned,
		source: form.source || undefined,
		chunks: imported.chunks,
	};
}

export function HubCodexPanel({ isDark, projects, onOpenCapture }: HubCodexPanelProps) {
	const hub = getHubTheme(isDark);
	const [items, setItems] = useState<CodexItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
	const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
	const [search, setSearch] = useState('');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [form, setForm] = useState<CodexFormState>(() => emptyCodexForm({ type: 'style', scope: 'global' }));
	const [importOpen, setImportOpen] = useState(false);
	const [importText, setImportText] = useState('');
	const [importTitle, setImportTitle] = useState('');
	const [importSource, setImportSource] = useState('');
	const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);

	const reload = useCallback(() => {
		void listAllCodexItems().then((next) => {
			setItems(next);
			setLoading(false);
		});
	}, []);

	useEffect(() => {
		reload();
		const onChange = () => reload();
		window.addEventListener('dastan:codex-changed', onChange);
		return () => window.removeEventListener('dastan:codex-changed', onChange);
	}, [reload]);

	const rootProjects = useMemo(
		() => projects.filter((project) => !project.parentProjectId),
		[projects],
	);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		return items.filter((item) => {
			if (typeFilter !== 'all' && item.type !== typeFilter) {
				return false;
			}
			if (scopeFilter !== 'all' && item.scope !== scopeFilter) {
				return false;
			}
			if (!query) {
				return true;
			}
			const haystack = [
				item.title,
				item.content,
				item.tags.join(' '),
				item.type === 'style' ? item.instinct : '',
				item.type === 'style' ? (item.rationale ?? '') : '',
				item.type === 'reference' ? (item.source ?? '') : '',
			]
				.join(' ')
				.toLowerCase();
			return haystack.includes(query);
		});
	}, [items, typeFilter, scopeFilter, search]);

	const globalStyles = useMemo(
		() => items.filter((item): item is CodexStyle => isCodexStyle(item) && item.scope === 'global'),
		[items],
	);
	const voiceGroups = groupStylesByDomain(globalStyles);

	const inputClass =
		'rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
	const chipClass = `rounded-md border px-2.5 py-1 text-xs capitalize ${hub.dashed}`;
	const chipActiveClass = `rounded-md border px-2.5 py-1 text-xs capitalize border-gold/50 bg-gold/15 ${hub.panelTitle}`;
	const labelClass = `text-[10px] uppercase tracking-[0.12em] ${hub.panelMuted}`;

	const startCreate = (type: 'style' | 'reference' = 'style') => {
		setEditingId(null);
		setCreating(true);
		setImportOpen(false);
		setForm(emptyCodexForm({ type, scope: 'global' }));
	};

	const startEdit = (item: CodexItem) => {
		setCreating(false);
		setImportOpen(false);
		setEditingId(item.id);
		setForm(formFromCodexItem(item));
	};

	const cancelForm = () => {
		setCreating(false);
		setEditingId(null);
		setImportOpen(false);
	};

	const saveForm = async () => {
		const input = formToCreateInput(form);
		if (!input) {
			return;
		}

		if (editingId) {
			const existing = items.find((item) => item.id === editingId);
			if (!existing) {
				return;
			}

			if (existing.type === 'style' && input.type === 'style') {
				await saveCodexItem({
					...existing,
					title: input.title?.trim() || existing.title,
					content: input.content ?? '',
					scope: input.scope,
					projectId: input.projectId,
					documentId: input.documentId,
					tags: input.tags ?? [],
					pinned: input.pinned ?? false,
					domain: input.domain,
					appliesWhen: input.appliesWhen ?? [],
					instinct: input.instinct,
					rationale: input.rationale,
					exemplars: input.exemplars,
					updatedAt: new Date().toISOString(),
				});
			} else if (existing.type === 'reference' && input.type === 'reference') {
				await saveCodexItem({
					...existing,
					title: input.title,
					content: input.content ?? '',
					scope: input.scope,
					projectId: input.projectId,
					documentId: input.documentId,
					tags: input.tags ?? [],
					pinned: input.pinned ?? false,
					source: input.source,
					chunks: input.chunks ?? existing.chunks,
					updatedAt: new Date().toISOString(),
				});
			}
		} else {
			await createCodexItem(input);
		}

		notifyCodexChanged();
		cancelForm();
		reload();
	};

	const handleImportPaste = async () => {
		const parsed = chunkMarkdownByHeadings(importText);
		await createCodexItem({
			type: 'reference',
			title: importTitle.trim() || parsed.suggestedTitle,
			content: parsed.content,
			scope: 'global',
			pinned: false,
			source: importSource.trim() || undefined,
			chunks: parsed.chunks,
			tags: [],
		});
		notifyCodexChanged();
		setImportOpen(false);
		setImportText('');
		setImportTitle('');
		setImportSource('');
		reload();
	};

	const handleImportFile = async (file: File) => {
		const text = await file.text();
		const parsed = parseCodexImportFile(file.name, text);
		setImportTitle(parsed.suggestedTitle);
		setImportText(parsed.content);
		setImportOpen(true);
		setCreating(false);
		setEditingId(null);
	};

	return (
		<>
		<section>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className={`mb-1 text-lg font-semibold ${hub.panelTitle}`}>Codex</h2>
					<p className={`max-w-2xl text-sm ${hub.panelMuted}`}>
						Reference craft notes and articulated style instincts. Pinned and relevant entries feed the AI
						assistant; everything here is yours to read too.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button size="sm" type="button" variant="outline" onClick={() => startCreate('style')}>
						<Plus className="mr-1 size-3.5" />
						Style
					</Button>
					<Button size="sm" type="button" variant="outline" onClick={() => startCreate('reference')}>
						<BookOpen className="mr-1 size-3.5" />
						Reference
					</Button>
					<Button
						size="sm"
						type="button"
						variant="outline"
						onClick={() => {
							setImportOpen(true);
							setCreating(false);
							setEditingId(null);
						}}
					>
						<Upload className="mr-1 size-3.5" />
						Import
					</Button>
					{onOpenCapture ? (
						<Button size="sm" type="button" onClick={onOpenCapture}>
							Quick capture
						</Button>
					) : null}
				</div>
			</div>

			{globalStyles.length > 0 ? (
				<div className={`mb-6 rounded-xl border px-4 py-3 ${hub.card}`}>
					<p className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${hub.panelMuted}`}>
						Voice — global style
					</p>
					<div className="space-y-3">
						{Object.entries(voiceGroups).map(([domain, styles]) => (
							<div key={domain}>
								<p className={`mb-1 text-xs font-semibold capitalize ${hub.panelTitle}`}>{domain}</p>
								<ul className={`space-y-1 text-sm ${hub.panelMuted}`}>
									{styles.map((style) => (
										<li key={style.id}>
											<button
												className="text-left hover:underline"
												type="button"
												onClick={() => startEdit(style)}
											>
												{style.instinct}
												{style.appliesWhen.length > 0 ? (
													<span className="opacity-70">
														{' '}
														· {style.appliesWhen.map(labelAppliesWhen).join(', ')}
													</span>
												) : null}
											</button>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>
			) : null}

			{(creating || editingId || importOpen) && (
				<div className={`mb-6 rounded-xl border p-4 ${hub.card}`}>
					{importOpen ? (
						<div className="space-y-3">
							<p className={`text-sm font-semibold ${hub.panelTitle}`}>Import reference notes</p>
							<p className={`text-xs ${hub.panelMuted}`}>
								Paste markdown or .txt — long notes are split on headings for AI retrieval. PDF later.
							</p>
							<label className="block">
								<span className={labelClass}>Title</span>
								<input
									className={`mt-1 w-full ${inputClass}`}
									value={importTitle}
									onChange={(event) => setImportTitle(event.target.value)}
								/>
							</label>
							<label className="block">
								<span className={labelClass}>Source</span>
								<input
									className={`mt-1 w-full ${inputClass}`}
									placeholder="Save the Cat"
									value={importSource}
									onChange={(event) => setImportSource(event.target.value)}
								/>
							</label>
							<textarea
								className={`min-h-48 w-full resize-y font-mono text-xs ${inputClass}`}
								placeholder="Paste notes…"
								value={importText}
								onChange={(event) => setImportText(event.target.value)}
							/>
							<div className="flex flex-wrap items-center gap-2">
								<label className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs ${hub.dashed}`}>
									Choose .md / .txt
									<input
										accept=".md,.txt,.markdown,text/plain,text/markdown"
										className="hidden"
										type="file"
										onChange={(event) => {
											const file = event.target.files?.[0];
											if (file) {
												void handleImportFile(file);
											}
										}}
									/>
								</label>
								<Button
									size="sm"
									type="button"
									disabled={!importText.trim()}
									onClick={() => void handleImportPaste()}
								>
									Save import
								</Button>
								<Button size="sm" type="button" variant="ghost" onClick={cancelForm}>
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<div className="space-y-3">
							<p className={`text-sm font-semibold ${hub.panelTitle}`}>
								{editingId ? 'Edit entry' : form.type === 'style' ? 'New style entry' : 'New reference'}
							</p>
							<CodexEditorForm
								value={form}
								onChange={setForm}
								inputClass={inputClass}
								labelClass={labelClass}
								chipClass={chipClass}
								chipActiveClass={chipActiveClass}
								scopeOptions={['global', 'project']}
								projectOptions={rootProjects.map((p) => ({ id: p.id, title: p.title }))}
							/>
							<div className="flex gap-2">
								<Button
									size="sm"
									type="button"
									disabled={form.type === 'style' ? !form.instinct.trim() : !form.content.trim() && !form.title.trim()}
									onClick={() => void saveForm()}
								>
									Save
								</Button>
								<Button size="sm" type="button" variant="ghost" onClick={cancelForm}>
									Cancel
								</Button>
							</div>
						</div>
					)}
				</div>
			)}

			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
				<input
					className={`min-w-0 flex-1 ${inputClass}`}
					placeholder="Search Codex…"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
				/>
				<div className="flex flex-wrap gap-1.5">
					{(['all', 'style', 'reference'] as const).map((key) => (
						<button
							key={key}
							className={typeFilter === key ? chipActiveClass : chipClass}
							type="button"
							onClick={() => setTypeFilter(key)}
						>
							{key === 'all' ? 'All types' : key}
						</button>
					))}
					{(['all', 'global', 'project', 'document'] as const).map((key) => (
						<button
							key={key}
							className={scopeFilter === key ? chipActiveClass : chipClass}
							type="button"
							onClick={() => setScopeFilter(key)}
						>
							{key === 'all' ? 'All scopes' : key}
						</button>
					))}
				</div>
			</div>

			{loading ? (
				<div className="h-24 animate-pulse rounded-xl bg-muted" />
			) : filtered.length === 0 ? (
				<div className={`rounded-xl border border-dashed p-12 text-center ${hub.dashed}`}>
					<HubEmptyMark />
					<p className={`mb-2 mt-3 text-base font-semibold ${hub.panelTitle}`}>Codex is empty</p>
					<p className={`mb-4 text-sm ${hub.panelMuted}`}>
						Capture a style instinct or import craft notes like Save the Cat.
					</p>
					<div className="flex justify-center gap-2">
						<Button type="button" variant="outline" onClick={() => startCreate('style')}>
							Add style
						</Button>
						<Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
							Import notes
						</Button>
					</div>
				</div>
			) : (
				<div className="space-y-2">
					{filtered.map((item) => (
						<article key={item.id} className={`rounded-xl border px-4 py-3 ${hub.card}`}>
							<div className="flex items-start justify-between gap-3">
								<button className="min-w-0 flex-1 text-left" type="button" onClick={() => startEdit(item)}>
									<div className="flex flex-wrap items-center gap-2">
										<span className={`text-sm font-semibold ${hub.panelTitle}`}>
											{item.title || (item.type === 'style' ? 'Style note' : 'Untitled')}
										</span>
										<span className={`text-[10px] uppercase tracking-[0.12em] ${hub.panelMuted}`}>
											{item.type}
										</span>
										<span className={`text-[10px] ${hub.panelMuted}`}>{scopeLabel(item, projects)}</span>
										{item.pinned ? (
											<span className="inline-flex items-center gap-0.5 text-[10px] text-gold">
												<Pin size={10} /> Pinned
											</span>
										) : null}
									</div>
									<p className={`mt-1 line-clamp-2 text-sm ${hub.panelMuted}`}>
										{item.type === 'style' ? item.instinct : item.content.slice(0, 200) || item.source}
									</p>
								</button>
								<button
									className={`shrink-0 rounded-md border p-1.5 ${hub.dashed}`}
									title="Delete"
									type="button"
									aria-label="Delete Codex entry"
									onClick={() => {
										setPendingDelete({
											id: item.id,
											label: item.title || (item.type === 'style' ? 'Style note' : 'Untitled'),
										});
									}}
								>
									<Trash2 size={14} />
								</button>
							</div>
						</article>
					))}
				</div>
			)}
		</section>
		<ConfirmDialog
			open={Boolean(pendingDelete)}
			title="Delete Codex entry"
			description={`Delete "${pendingDelete?.label ?? 'this entry'}"? This cannot be undone.`}
			confirmLabel="Delete"
			destructive
			onCancel={() => setPendingDelete(null)}
			onConfirm={() => {
				const id = pendingDelete?.id;
				setPendingDelete(null);

				if (!id) {
					return;
				}

				void deleteCodexItem(id).then(() => {
					notifyCodexChanged();
					reload();
				});
			}}
		/>
		</>
	);
}
