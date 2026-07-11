import { useState, type ReactNode } from 'react';
import { Check, Pin, Trash2, X } from 'lucide-react';
import {
	createAiMemory,
	deleteAiMemory,
	saveAiMemory,
	type AiMemory,
} from '../../utils/ai-memory-storage';
import { getEditorTheme } from '../../utils/editor-theme';
import { ConfirmDialog } from '../ConfirmDialog';

interface AiMemoryDrawerProps {
	open: boolean;
	isDark: boolean;
	documentId: string;
	projectId?: string;
	memories: AiMemory[];
	onClose: () => void;
	onMemoriesChange: () => void;
}

function scopeLabel(memory: AiMemory): string {
	if (memory.scope === 'document') {
		return 'This script';
	}

	if (memory.scope === 'project') {
		return 'Project';
	}

	return 'All scripts';
}

export function AiMemoryDrawer({
	open,
	isDark,
	documentId,
	projectId,
	memories,
	onClose,
	onMemoriesChange,
}: AiMemoryDrawerProps) {
	const theme = getEditorTheme(isDark);
	const [draft, setDraft] = useState('');
	const [scope, setScope] = useState<'global' | 'document' | 'project'>('document');
	const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
	const scopeOptions = projectId ? (['document', 'project', 'global'] as const) : (['document', 'global'] as const);

	if (!open) {
		return null;
	}

	const pinned = memories.filter((memory) => memory.pinned && (memory.status ?? 'approved') !== 'suggested');
	const approved = memories.filter((memory) => !memory.pinned && (memory.status ?? 'approved') === 'approved');
	const suggested = memories.filter((memory) => (memory.status ?? 'approved') === 'suggested');

	const inputClass = `min-h-20 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`;

	const renderMemory = (memory: AiMemory, options?: { showApprove?: boolean }) => (
		<div key={memory.id} className={`rounded-xl border p-3 ${theme.sceneCard}`}>
			<div className="mb-2 flex items-center justify-between gap-2">
				<span className={`text-[10px] uppercase tracking-[0.14em] ${theme.statusText}`}>
					{scopeLabel(memory)}
				</span>
				<div className="flex items-center gap-1">
					{options?.showApprove ? (
						<>
							<button
								className={`rounded-md border p-1 ${theme.accentPill}`}
								title="Approve memory"
								type="button"
								onClick={() => {
									void saveAiMemory({
										...memory,
										status: 'approved',
										pinned: false,
										updatedAt: new Date().toISOString(),
									}).then(onMemoriesChange);
								}}
							>
								<Check size={12} />
							</button>
							<button
								className={`rounded-md border p-1 ${theme.statusPill}`}
								title="Dismiss suggestion"
								type="button"
								onClick={() => {
									void deleteAiMemory(memory.id).then(onMemoriesChange);
								}}
							>
								<X size={12} />
							</button>
						</>
					) : (
						<>
							<button
								className={`rounded-md border p-1 ${memory.pinned ? theme.accentPill : theme.statusPill}`}
								title="Toggle pinned"
								type="button"
								onClick={() => {
									void saveAiMemory({
										...memory,
										pinned: !memory.pinned,
										updatedAt: new Date().toISOString(),
									}).then(onMemoriesChange);
								}}
							>
								<Pin size={12} />
							</button>
							<button
								className={`rounded-md border p-1 ${theme.statusPill}`}
								title="Delete memory"
								type="button"
								aria-label="Delete memory"
								onClick={() => {
									setPendingDelete({
										id: memory.id,
										label: memory.content.trim().slice(0, 80) || 'memory',
									});
								}}
							>
								<Trash2 size={12} />
							</button>
						</>
					)}
				</div>
			</div>
			<textarea
				className={`min-h-16 w-full resize-y rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none ${theme.border}`}
				value={memory.content}
				onChange={(event) => {
					void saveAiMemory({
						...memory,
						content: event.target.value,
						updatedAt: new Date().toISOString(),
					}).then(onMemoriesChange);
				}}
			/>
		</div>
	);

	return (
		<>
		<div className={`absolute inset-0 z-30 flex flex-col backdrop-blur-sm ${isDark ? 'bg-ink-soft/98' : 'bg-[#f6f2ea]/98'}`}>
			<div className={`flex items-center justify-between border-b px-4 py-3 ${theme.border}`}>
				<div>
					<h3 className={`text-sm font-semibold ${theme.panelTitle}`}>Memories</h3>
					<p className={`text-xs ${theme.statusText}`}>Pinned, approved, and suggested facts for context.</p>
				</div>
				<button
					aria-label="Close memories"
					className={`rounded-md border p-1.5 ${theme.statusPill}`}
					type="button"
					onClick={onClose}
				>
					<X size={14} />
				</button>
			</div>

			<div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
				<div className="space-y-2">
					<label className={`text-[10px] uppercase tracking-[0.14em] ${theme.statusText}`}>Add memory</label>
					<div className={`grid gap-2 ${scopeOptions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
						{scopeOptions.map((option) => (
							<button
								key={option}
								className={cnScopeButton(scope === option, theme)}
								type="button"
								onClick={() => setScope(option)}
							>
								{option}
							</button>
						))}
					</div>
					<textarea
						className={inputClass}
						placeholder="e.g. Protagonist is Sarah. Act 2 reveal is the twin sister."
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
					/>
					<button
						className={`rounded-md border px-3 py-2 text-[10px] uppercase tracking-[0.14em] ${theme.accentPill}`}
						type="button"
						onClick={() => {
							const content = draft.trim();

							if (!content) {
								return;
							}

							void createAiMemory({
								scope,
								documentId: scope === 'document' ? documentId : undefined,
								projectId: scope === 'project' ? projectId : undefined,
								content,
								pinned: true,
								status: 'approved',
							}).then(() => {
								setDraft('');
								onMemoriesChange();
							});
						}}
					>
						Pin memory
					</button>
				</div>

				<MemorySection emptyLabel="No pinned memories." label="Pinned" theme={theme}>
					{pinned.map((memory) => renderMemory(memory))}
				</MemorySection>

				<MemorySection emptyLabel="No approved memories." label="Approved" theme={theme}>
					{approved.map((memory) => renderMemory(memory))}
				</MemorySection>

				<MemorySection emptyLabel="No suggestions awaiting review." label="Suggested" theme={theme}>
					{suggested.map((memory) => renderMemory(memory, { showApprove: true }))}
				</MemorySection>
			</div>
		</div>
		<ConfirmDialog
			open={Boolean(pendingDelete)}
			title="Delete memory"
			description={`Delete "${pendingDelete?.label ?? 'this memory'}"? This cannot be undone.`}
			confirmLabel="Delete"
			destructive
			onCancel={() => setPendingDelete(null)}
			onConfirm={() => {
				const id = pendingDelete?.id;
				setPendingDelete(null);

				if (!id) {
					return;
				}

				void deleteAiMemory(id).then(onMemoriesChange);
			}}
		/>
		</>
	);
}

function MemorySection({
	label,
	emptyLabel,
	theme,
	children,
}: {
	label: string;
	emptyLabel: string;
	theme: ReturnType<typeof getEditorTheme>;
	children: ReactNode;
}) {
	const items = Array.isArray(children) ? children : [children];
	const hasItems = items.some((child) => child);

	return (
		<div className="space-y-2">
			<h4 className={`text-[10px] uppercase tracking-[0.16em] ${theme.statusText}`}>{label}</h4>
			{hasItems ? <div className="space-y-2">{children}</div> : <p className={`text-sm ${theme.statusText}`}>{emptyLabel}</p>}
		</div>
	);
}

function cnScopeButton(active: boolean, theme: ReturnType<typeof getEditorTheme>): string {
	return active
		? `rounded-md border px-3 py-2 text-xs uppercase tracking-[0.14em] ${theme.modeActive}`
		: `rounded-md border px-3 py-2 text-xs uppercase tracking-[0.14em] ${theme.statusPill}`;
}
