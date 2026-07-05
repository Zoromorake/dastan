import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { deleteChatThread, listChatThreads, saveChatThread, type AiChatThread } from '../../utils/ai-memory-storage';
import { resolveModelOption } from '../../utils/ai-models';

interface AiChatThreadSidebarProps {
	open: boolean;
	documentId: string;
	activeThreadId: string | null;
	isDark: boolean;
	refreshKey: number;
	onClose: () => void;
	onSelectThread: (threadId: string) => void;
	onNewThread: () => void;
	onThreadDeleted: (threadId: string) => void;
	onThreadRenamed: () => void;
}

type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older';

const DATE_GROUP_ORDER: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Older'];

function getDateGroup(iso: string): DateGroup {
	const date = new Date(iso);
	const now = new Date();
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
	const startOfWeek = new Date(startOfToday.getTime() - 7 * 86_400_000);

	if (date >= startOfToday) {
		return 'Today';
	}

	if (date >= startOfYesterday) {
		return 'Yesterday';
	}

	if (date >= startOfWeek) {
		return 'This Week';
	}

	return 'Older';
}

function formatRelativeTime(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const minutes = Math.floor(diffMs / 60_000);

	if (minutes < 1) {
		return 'just now';
	}

	if (minutes < 60) {
		return `${minutes}m ago`;
	}

	const hours = Math.floor(minutes / 60);

	if (hours < 24) {
		return `${hours}h ago`;
	}

	const days = Math.floor(hours / 24);

	if (days < 7) {
		return `${days}d ago`;
	}

	return new Date(iso).toLocaleDateString();
}

function getModelLabel(modelId: string): string {
	return resolveModelOption(modelId)?.label ?? modelId;
}

export function AiChatThreadSidebar({
	open,
	documentId,
	activeThreadId,
	isDark,
	refreshKey,
	onClose,
	onSelectThread,
	onNewThread,
	onThreadDeleted,
	onThreadRenamed,
}: AiChatThreadSidebarProps) {
	const [threads, setThreads] = useState<AiChatThread[]>([]);
	const [query, setQuery] = useState('');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState('');
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

	useEffect(() => {
		if (!open) {
			return;
		}

		void listChatThreads(documentId).then(setThreads);
	}, [documentId, open, refreshKey]);

	const filteredThreads = useMemo(() => {
		const normalized = query.trim().toLowerCase();

		if (!normalized) {
			return threads;
		}

		return threads.filter((thread) => thread.title.toLowerCase().includes(normalized));
	}, [query, threads]);

	const groupedThreads = useMemo(() => {
		const groups = new Map<DateGroup, AiChatThread[]>();

		for (const group of DATE_GROUP_ORDER) {
			groups.set(group, []);
		}

		for (const thread of filteredThreads) {
			const group = getDateGroup(thread.updatedAt);
			groups.get(group)?.push(thread);
		}

		return DATE_GROUP_ORDER
			.map((label) => ({ label, threads: groups.get(label) ?? [] }))
			.filter((group) => group.threads.length > 0);
	}, [filteredThreads]);

	const saveTitle = (thread: AiChatThread, title: string) => {
		const trimmed = title.trim();

		if (!trimmed) {
			return;
		}

		void saveChatThread({ ...thread, title: trimmed }).then(() => {
			setEditingId(null);
			setEditTitle('');
			onThreadRenamed();
		});
	};

	if (!open) {
		return null;
	}

	const panelClass = isDark
		? 'absolute inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-700 bg-slate-900 shadow-xl'
		: 'absolute inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-stone-300 bg-[#f6f2ea] shadow-xl';
	const inputClass = isDark
		? 'w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-600/70'
		: 'w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-800 outline-none focus:border-amber-400';

	return (
		<>
			<button
				aria-label="Close threads"
				className="absolute inset-0 z-30 bg-black/20"
				type="button"
				onClick={onClose}
			/>

			<div className={panelClass}>
				<div className={`flex items-center justify-between border-b px-3 py-2 ${isDark ? 'border-slate-700' : 'border-stone-300'}`}>
					<span className={`text-xs font-medium uppercase tracking-[0.14em] ${isDark ? 'text-slate-300' : 'text-stone-700'}`}>
						Threads
					</span>
					<button
						className={`rounded-md border p-1 ${isDark ? 'border-slate-600 text-slate-400' : 'border-stone-300 text-stone-500'}`}
						type="button"
						aria-label="Close threads"
						onClick={onClose}
					>
						<X size={12} />
					</button>
				</div>

				<div className={`space-y-2 border-b px-3 py-2 ${isDark ? 'border-slate-700' : 'border-stone-300'}`}>
					<button
						className={`inline-flex w-full items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] ${
							isDark ? 'border-amber-700 text-amber-200 hover:bg-amber-950/30' : 'border-amber-400 text-stone-900 hover:bg-amber-50'
						}`}
						type="button"
						onClick={() => {
							onNewThread();
							onClose();
						}}
					>
						<Plus size={12} />
						New Chat
					</button>

					<div className="relative">
						<Search
							size={12}
							className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-stone-400'}`}
						/>
						<input
							className={`${inputClass} pl-7`}
							placeholder="Search threads…"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</div>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto py-2">
					{groupedThreads.length === 0 ? (
						<p className={`px-3 py-4 text-xs ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>
							{query ? 'No matching threads.' : 'No conversations yet.'}
						</p>
					) : (
						groupedThreads.map((group) => (
							<div key={group.label} className="mb-3">
								<p className={`px-3 pb-1 text-[10px] uppercase tracking-[0.14em] ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>
									{group.label}
								</p>

								{group.threads.map((thread) => (
									<div
										key={thread.id}
										className={`group px-2 py-1 ${
											thread.id === activeThreadId
												? isDark
													? 'bg-slate-800/80'
													: 'bg-amber-50/80'
												: ''
										}`}
									>
										{pendingDeleteId === thread.id ? (
											<div className={`rounded-md border px-2 py-2 text-xs ${isDark ? 'border-slate-700 bg-slate-800' : 'border-stone-200 bg-white'}`}>
												<p className={isDark ? 'text-slate-300' : 'text-stone-700'}>Delete this conversation?</p>
												<div className="mt-2 flex gap-2">
													<button
														className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
															isDark ? 'border-red-800 text-red-300' : 'border-red-300 text-red-700'
														}`}
														type="button"
														onClick={() => {
															void deleteChatThread(thread.id).then(() => {
																setPendingDeleteId(null);
																onThreadDeleted(thread.id);
															});
														}}
													>
														Delete
													</button>
													<button
														className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
															isDark ? 'border-slate-600 text-slate-400' : 'border-stone-300 text-stone-500'
														}`}
														type="button"
														onClick={() => setPendingDeleteId(null)}
													>
														Cancel
													</button>
												</div>
											</div>
										) : editingId === thread.id ? (
											<form
												className="min-w-0"
												onSubmit={(event) => {
													event.preventDefault();
													saveTitle(thread, editTitle);
												}}
											>
												<input
													autoFocus
													className={inputClass}
													value={editTitle}
													onChange={(event) => setEditTitle(event.target.value)}
													onBlur={() => saveTitle(thread, editTitle)}
													onKeyDown={(event) => {
														if (event.key === 'Escape') {
															setEditingId(null);
															setEditTitle('');
														}
													}}
												/>
											</form>
										) : (
											<div className="flex items-start gap-1">
												<button
													className={`min-w-0 flex-1 px-1 py-1 text-left ${
														thread.id === activeThreadId
															? isDark
																? 'text-amber-200'
																: 'text-stone-900'
															: isDark
																? 'text-slate-300 hover:text-slate-100'
																: 'text-stone-700 hover:text-stone-900'
													}`}
													type="button"
													onClick={() => onSelectThread(thread.id)}
												>
													<span className="line-clamp-2 block text-sm leading-5">{thread.title}</span>
													<span className={`mt-0.5 block text-[10px] ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>
														{getModelLabel(thread.model)} · {formatRelativeTime(thread.updatedAt)}
													</span>
												</button>

												<button
													className={`mt-1 shrink-0 rounded p-1 opacity-0 transition group-hover:opacity-100 ${
														isDark ? 'text-slate-500 hover:text-slate-200' : 'text-stone-400 hover:text-stone-700'
													}`}
													type="button"
													title="Rename thread"
													onClick={() => {
														setEditingId(thread.id);
														setEditTitle(thread.title);
													}}
												>
													<Pencil size={11} />
												</button>

												<button
													className={`mt-1 shrink-0 rounded p-1 opacity-0 transition group-hover:opacity-100 ${
														isDark ? 'text-slate-500 hover:text-red-400' : 'text-stone-400 hover:text-red-600'
													}`}
													type="button"
													title="Delete thread"
													onClick={() => setPendingDeleteId(thread.id)}
												>
													<Trash2 size={11} />
												</button>
											</div>
										)}
									</div>
								))}
							</div>
						))
					)}
				</div>
			</div>
		</>
	);
}
