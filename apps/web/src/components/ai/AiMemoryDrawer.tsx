import { useState } from 'react';
import { Pin, Trash2, X } from 'lucide-react';
import { createAiMemory, deleteAiMemory, saveAiMemory, type AiMemory } from '../../utils/ai-memory-storage';

interface AiMemoryDrawerProps {
	open: boolean;
	isDark: boolean;
	documentId: string;
	projectId?: string;
	memories: AiMemory[];
	onClose: () => void;
	onMemoriesChange: () => void;
}

export function AiMemoryDrawer({ open, isDark, documentId, projectId, memories, onClose, onMemoriesChange }: AiMemoryDrawerProps) {
	const [draft, setDraft] = useState('');
	const [scope, setScope] = useState<'global' | 'document' | 'project'>('document');
	const scopeOptions = projectId ? (['document', 'project', 'global'] as const) : (['document', 'global'] as const);

	if (!open) {
		return null;
	}

	const panelClass = isDark
		? 'absolute inset-0 z-30 flex flex-col bg-slate-900/98 backdrop-blur-sm'
		: 'absolute inset-0 z-30 flex flex-col bg-[#f6f2ea]/98 backdrop-blur-sm';
	const inputClass = isDark
		? 'min-h-24 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200'
		: 'min-h-24 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800';

	return (
		<div className={panelClass}>
			<div className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? 'border-slate-700' : 'border-stone-300'}`}>
				<div>
					<h3 className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-stone-900'}`}>Memories</h3>
					<p className={`text-xs ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>Pinned facts the assistant always remembers.</p>
				</div>
				<button
					className={`rounded-md border p-1.5 ${isDark ? 'border-slate-600 text-slate-300' : 'border-stone-300 text-stone-600'}`}
					type="button"
					onClick={onClose}
					aria-label="Close memories"
				>
					<X size={14} />
				</button>
			</div>

			<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
				<div className="space-y-2">
					<label className={`text-[10px] uppercase tracking-[0.16em] ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>Scope</label>
					<div className={`grid gap-2 ${scopeOptions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
						{scopeOptions.map((option) => (
							<button
								key={option}
								className={`rounded-md border px-3 py-2 text-xs uppercase tracking-[0.14em] ${
									scope === option
										? isDark
											? 'border-amber-600 bg-amber-950/40 text-amber-200'
											: 'border-amber-400 bg-amber-50 text-stone-900'
										: isDark
											? 'border-slate-600 text-slate-400'
											: 'border-stone-300 text-stone-600'
								}`}
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
						className={`rounded-md border px-3 py-2 text-[10px] uppercase tracking-[0.16em] ${isDark ? 'border-amber-700 text-amber-200' : 'border-amber-400 text-stone-900'}`}
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
							}).then(() => {
								setDraft('');
								onMemoriesChange();
							});
						}}
					>
						Pin memory
					</button>
				</div>

				<div className="space-y-2">
					{memories.length === 0 ? (
						<p className={`text-sm ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>No memories yet.</p>
					) : (
						memories.map((memory) => (
							<div
								key={memory.id}
								className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-stone-300 bg-white'}`}
							>
								<div className="mb-2 flex items-center justify-between gap-2">
									<span className={`text-[10px] uppercase tracking-[0.16em] ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>
										{memory.scope}
									</span>
									<div className="flex items-center gap-1">
										<button
											className={`rounded-md border p-1 ${memory.pinned ? (isDark ? 'border-amber-700 text-amber-200' : 'border-amber-400 text-amber-700') : isDark ? 'border-slate-600 text-slate-400' : 'border-stone-300 text-stone-500'}`}
											type="button"
											title="Toggle pinned"
											onClick={() => {
												void saveAiMemory({ ...memory, pinned: !memory.pinned, updatedAt: new Date().toISOString() }).then(onMemoriesChange);
											}}
										>
											<Pin size={12} />
										</button>
										<button
											className={`rounded-md border p-1 ${isDark ? 'border-slate-600 text-slate-400' : 'border-stone-300 text-stone-500'}`}
											type="button"
											title="Delete memory"
											onClick={() => {
												void deleteAiMemory(memory.id).then(onMemoriesChange);
											}}
										>
											<Trash2 size={12} />
										</button>
									</div>
								</div>
								<p className={`text-sm leading-6 ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>{memory.content}</p>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
