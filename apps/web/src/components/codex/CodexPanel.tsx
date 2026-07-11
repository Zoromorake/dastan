import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookMarked, Pin, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '../ConfirmDialog';
import { getEditorTheme } from '../../utils/editor-theme';
import {
	createCodexItem,
	deleteCodexItem,
	listAllCodexItems,
	saveCodexItem,
	type CodexItem,
} from '../../utils/codex-storage';
import { notifyCodexChanged } from '../../utils/codex-events';
import { labelAppliesWhen } from '../../utils/codex-applies-when';
import {
	CodexEditorForm,
	formFromCodexItem,
	parseTagList,
	type CodexFormState,
} from './CodexEditorForm';

interface CodexPanelProps {
	open: boolean;
	isDark: boolean;
	documentId: string;
	projectId?: string;
	onClose: () => void;
	onOpenCapture?: () => void;
}

type ViewMode = 'relevant' | 'all';

export function CodexPanel({
	open,
	isDark,
	documentId,
	projectId,
	onClose,
	onOpenCapture,
}: CodexPanelProps) {
	const theme = getEditorTheme(isDark);
	const [items, setItems] = useState<CodexItem[]>([]);
	const [view, setView] = useState<ViewMode>('relevant');
	const [quickInstinct, setQuickInstinct] = useState('');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<CodexFormState | null>(null);
	const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);

	const reload = useCallback(() => {
		void listAllCodexItems().then(setItems);
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}
		reload();
		const onChange = () => reload();
		window.addEventListener('dastan:codex-changed', onChange);
		return () => window.removeEventListener('dastan:codex-changed', onChange);
	}, [open, reload]);

	const displayed = useMemo(() => {
		if (view === 'all') {
			return items;
		}
		return items.filter(
			(item) =>
				(item.scope === 'document' && item.documentId === documentId) ||
				(item.scope === 'project' && Boolean(projectId) && item.projectId === projectId) ||
				(item.scope === 'global' && item.pinned),
		);
	}, [items, view, documentId, projectId]);

	if (!open) {
		return null;
	}

	const inputClass = `w-full rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`;
	const chipClass = `rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${theme.statusPill}`;
	const chipActiveClass = `rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${theme.accentPill}`;
	const labelClass = `text-[10px] uppercase tracking-[0.12em] ${theme.statusText}`;

	const captureQuick = async () => {
		const instinct = quickInstinct.trim();
		if (!instinct) {
			return;
		}
		await createCodexItem({
			type: 'style',
			instinct,
			domain: 'visual',
			scope: 'document',
			documentId,
			projectId,
			pinned: false,
			appliesWhen: [],
		});
		setQuickInstinct('');
		notifyCodexChanged();
		reload();
	};

	const promoteToGlobal = async (item: CodexItem) => {
		await saveCodexItem({
			...item,
			scope: 'global',
			documentId: undefined,
			projectId: undefined,
			updatedAt: new Date().toISOString(),
		});
		notifyCodexChanged();
		reload();
	};

	const saveEdit = async () => {
		if (!form || !editingId) {
			return;
		}
		const existing = items.find((item) => item.id === editingId);
		if (!existing) {
			return;
		}
		const tags = parseTagList(form.tags);

		if (existing.type === 'style' && form.type === 'style') {
			await saveCodexItem({
				...existing,
				title: form.title.trim() || existing.title,
				content: form.content,
				scope: form.scope,
				projectId: form.scope === 'project' ? form.projectId ?? projectId : undefined,
				documentId: form.scope === 'document' ? form.documentId ?? documentId : undefined,
				tags,
				pinned: form.pinned,
				domain: form.domain,
				appliesWhen: form.appliesWhen,
				instinct: form.instinct,
				rationale: form.rationale || undefined,
				exemplars: parseTagList(form.exemplars),
				updatedAt: new Date().toISOString(),
			});
		} else if (existing.type === 'reference' && form.type === 'reference') {
			await saveCodexItem({
				...existing,
				title: form.title.trim() || existing.title,
				content: form.content,
				scope: form.scope,
				projectId: form.scope === 'project' ? form.projectId ?? projectId : undefined,
				documentId: form.scope === 'document' ? form.documentId ?? documentId : undefined,
				tags,
				pinned: form.pinned,
				source: form.source || undefined,
				updatedAt: new Date().toISOString(),
			});
		}

		setEditingId(null);
		setForm(null);
		notifyCodexChanged();
		reload();
	};

	return (
		<>
		<aside
			className={cn(
				'flex h-full w-[min(22rem,100%)] shrink-0 flex-col border-l',
				theme.surface,
				theme.border,
			)}
		>
			<div className={`flex items-center justify-between gap-2 border-b px-3 py-2.5 ${theme.border}`}>
				<div className="flex items-center gap-2">
					<BookMarked size={16} className="text-muted-foreground" />
					<span className="text-sm font-semibold">Codex</span>
				</div>
				<button
					aria-label="Close Codex"
					className={`rounded-md p-1 ${theme.statusText} hover:text-foreground`}
					type="button"
					onClick={onClose}
				>
					<X size={16} />
				</button>
			</div>

			<div className={`flex gap-1 border-b px-3 py-2 ${theme.border}`}>
				{(['relevant', 'all'] as const).map((mode) => (
					<button
						key={mode}
						className={view === mode ? chipActiveClass : chipClass}
						type="button"
						onClick={() => setView(mode)}
					>
						{mode === 'relevant' ? 'Relevant' : 'All'}
					</button>
				))}
				<div className="flex-1" />
				{onOpenCapture ? (
					<button className={chipClass} type="button" onClick={onOpenCapture} title="Quick capture">
						<Plus size={12} />
					</button>
				) : null}
			</div>

			<div className={`border-b px-3 py-2 ${theme.border}`}>
				<p className={`mb-1 ${labelClass}`}>Quick capture (this script)</p>
				<div className="flex gap-2">
					<input
						className={inputClass}
						placeholder="Style instinct…"
						value={quickInstinct}
						onChange={(event) => setQuickInstinct(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								void captureQuick();
							}
						}}
					/>
					<Button size="sm" type="button" disabled={!quickInstinct.trim()} onClick={() => void captureQuick()}>
						Add
					</Button>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto p-3">
				{form && editingId ? (
					<div className="space-y-3">
						<CodexEditorForm
							value={form}
							onChange={setForm}
							inputClass={inputClass}
							labelClass={labelClass}
							chipClass={chipClass}
							chipActiveClass={chipActiveClass}
							scopeOptions={projectId ? ['document', 'project', 'global'] : ['document', 'global']}
							showTypeToggle={false}
						/>
						<div className="flex gap-2">
							<Button size="sm" type="button" onClick={() => void saveEdit()}>
								Save
							</Button>
							<Button
								size="sm"
								type="button"
								variant="ghost"
								onClick={() => {
									setEditingId(null);
									setForm(null);
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : displayed.length === 0 ? (
					<p className={`px-1 py-8 text-center text-sm ${theme.statusText}`}>
						No Codex entries yet. Capture a style note above or import craft notes from the Hub.
					</p>
				) : (
					<div className="space-y-2">
						{displayed.map((item) => (
							<div key={item.id} className={`rounded-xl border p-3 ${theme.sceneCard}`}>
								<div className="mb-1 flex items-center justify-between gap-2">
									<span className={`text-[10px] uppercase tracking-[0.12em] ${theme.statusText}`}>
										{item.type} · {item.scope}
										{item.pinned ? ' · pinned' : ''}
									</span>
									<div className="flex items-center gap-1">
										{item.scope !== 'global' ? (
											<button
												className={`rounded-md border p-1 ${theme.statusPill}`}
												title="Promote to global"
												type="button"
												onClick={() => void promoteToGlobal(item)}
											>
												<Pin size={11} />
											</button>
										) : null}
										<button
											className={`rounded-md border p-1 ${theme.statusPill}`}
											title="Delete"
											type="button"
											aria-label="Delete Codex entry"
											onClick={() => {
												setPendingDelete({
													id: item.id,
													label: item.title || (item.type === 'style' ? 'Style' : 'Note'),
												});
											}}
										>
											<Trash2 size={11} />
										</button>
									</div>
								</div>
								<button
									className="w-full text-left"
									type="button"
									onClick={() => {
										setEditingId(item.id);
										setForm(formFromCodexItem(item));
									}}
								>
									<p className="text-sm font-medium">{item.title || (item.type === 'style' ? 'Style' : 'Note')}</p>
									<p className={`mt-1 text-xs ${theme.statusText}`}>
										{item.type === 'style'
											? item.instinct
											: item.content.slice(0, 160) || item.source || 'Empty'}
									</p>
									{item.type === 'style' && item.appliesWhen.length > 0 ? (
										<p className={`mt-1 text-[10px] ${theme.statusText}`}>
											When: {item.appliesWhen.map(labelAppliesWhen).join(', ')}
										</p>
									) : null}
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</aside>
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
