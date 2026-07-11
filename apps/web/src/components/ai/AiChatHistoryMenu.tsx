import { useEffect, useMemo, useState } from 'react';
import { Clock, Pencil, Search, Trash2 } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
	deleteChatThread,
	listChatThreads,
	listChatThreadsForDocumentIds,
	saveChatThread,
	type AiChatThread,
} from '../../utils/ai-memory-storage';
import { getEditorTheme } from '../../utils/editor-theme';

interface AiChatHistoryMenuProps {
	documentId: string;
	/** When set (editor mode), also lists library-wide threads under a separate section. */
	libraryDocumentId?: string;
	scriptScopeLabel?: string;
	activeThreadId: string | null;
	isDark: boolean;
	refreshKey: number;
	triggerClassName: string;
	onSelectThread: (threadId: string, title: string) => void;
	onThreadDeleted: (threadId: string) => void;
	onThreadRenamed: () => void;
}

type DateGroup = 'Today' | 'Previous 7 days' | 'Older';

const DATE_GROUP_ORDER: DateGroup[] = ['Today', 'Previous 7 days', 'Older'];

function getDateGroup(iso: string): DateGroup {
	const date = new Date(iso);
	const now = new Date();
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const startOfWeek = new Date(startOfToday.getTime() - 7 * 86_400_000);

	if (date >= startOfToday) {
		return 'Today';
	}

	if (date >= startOfWeek) {
		return 'Previous 7 days';
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
		return `${minutes}m`;
	}

	const hours = Math.floor(minutes / 60);

	if (hours < 24) {
		return `${hours}h`;
	}

	const days = Math.floor(hours / 24);

	if (days < 7) {
		return `${days}d`;
	}

	return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupThreadsByDate(threads: AiChatThread[]): Array<{ label: DateGroup; threads: AiChatThread[] }> {
	const groups = new Map<DateGroup, AiChatThread[]>();

	for (const group of DATE_GROUP_ORDER) {
		groups.set(group, []);
	}

	for (const thread of threads) {
		groups.get(getDateGroup(thread.updatedAt))?.push(thread);
	}

	return DATE_GROUP_ORDER.map((label) => ({ label, threads: groups.get(label) ?? [] })).filter(
		(group) => group.threads.length > 0,
	);
}

export function AiChatHistoryMenu({
	documentId,
	libraryDocumentId,
	scriptScopeLabel = 'This script',
	activeThreadId,
	isDark,
	refreshKey,
	triggerClassName,
	onSelectThread,
	onThreadDeleted,
	onThreadRenamed,
}: AiChatHistoryMenuProps) {
	const [open, setOpen] = useState(false);
	const [threads, setThreads] = useState<AiChatThread[]>([]);
	const [query, setQuery] = useState('');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState('');
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const theme = getEditorTheme(isDark);
	const showLibraryScope = Boolean(libraryDocumentId && libraryDocumentId !== documentId);

	const reloadThreads = () => {
		if (showLibraryScope && libraryDocumentId) {
			return listChatThreadsForDocumentIds([documentId, libraryDocumentId]).then(setThreads);
		}

		return listChatThreads(documentId).then(setThreads);
	};

	useEffect(() => {
		if (!open) {
			return;
		}

		void reloadThreads();
	}, [documentId, libraryDocumentId, open, refreshKey, showLibraryScope]);

	const filteredThreads = useMemo(() => {
		const normalized = query.trim().toLowerCase();

		if (!normalized) {
			return threads;
		}

		return threads.filter((thread) => thread.title.toLowerCase().includes(normalized));
	}, [query, threads]);

	const scopedGroups = useMemo(() => {
		if (!showLibraryScope || !libraryDocumentId) {
			return [{ scopeLabel: null as string | null, dateGroups: groupThreadsByDate(filteredThreads) }];
		}

		const scriptThreads = filteredThreads.filter((thread) => thread.documentId === documentId);
		const libraryThreads = filteredThreads.filter((thread) => thread.documentId === libraryDocumentId);

		return [
			{ scopeLabel: scriptScopeLabel, dateGroups: groupThreadsByDate(scriptThreads) },
			{ scopeLabel: 'Library', dateGroups: groupThreadsByDate(libraryThreads) },
		].filter((group) => group.dateGroups.length > 0);
	}, [documentId, filteredThreads, libraryDocumentId, scriptScopeLabel, showLibraryScope]);

	const hasThreads = scopedGroups.some((group) => group.dateGroups.length > 0);

	const saveTitle = (thread: AiChatThread, title: string) => {
		const trimmed = title.trim();

		if (!trimmed) {
			return;
		}

		void saveChatThread({ ...thread, title: trimmed }).then(() => {
			setEditingId(null);
			setEditTitle('');
			onThreadRenamed();
			void reloadThreads();
		});
	};

	const inputClass = cn(
		'w-full rounded-md border px-2 py-1.5 text-xs outline-none',
		theme.input,
	);

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger
				aria-label="Chat history"
				className={triggerClassName}
				title="Chat history"
				type="button"
			>
				<Clock size={14} />
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="z-[100] flex w-[min(18rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"
				sideOffset={6}
			>
				<div className={cn('border-b px-2 py-2', theme.border)}>
					<div className="relative">
						<Search
							className={cn('pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2', theme.statusText)}
						/>
						<input
							className={cn(inputClass, 'pl-7')}
							placeholder="Search chats…"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={(event) => event.stopPropagation()}
						/>
					</div>
				</div>

				<div className="max-h-64 overflow-y-auto py-1">
					{!hasThreads ? (
						<p className={cn('px-3 py-4 text-xs', theme.statusText)}>
							{query ? 'No matching chats.' : 'No conversations yet.'}
						</p>
					) : (
						scopedGroups.map((scopeGroup) => (
							<div key={scopeGroup.scopeLabel ?? 'all'} className="mb-1">
								{scopeGroup.scopeLabel ? (
									<p className={cn('px-3 py-1.5 text-[11px] font-medium', theme.panelTitle)}>
										{scopeGroup.scopeLabel}
									</p>
								) : null}

								{scopeGroup.dateGroups.map((group) => (
									<div key={`${scopeGroup.scopeLabel ?? 'all'}-${group.label}`} className="mb-1">
										<p className={cn('px-3 py-1 text-[10px] uppercase tracking-[0.12em]', theme.statusText)}>
											{group.label}
										</p>

										{group.threads.map((thread) => (
											<div
												key={thread.id}
												className={cn(
													'group mx-1 rounded-md px-1',
													thread.id === activeThreadId && theme.modeActive,
												)}
											>
												{pendingDeleteId === thread.id ? (
													<div className={cn('rounded-md border px-2 py-2 text-xs', theme.statusPill)}>
														<p>Delete this chat?</p>
														<div className="mt-2 flex gap-2">
															<button
																className="text-[10px] uppercase tracking-[0.1em] text-red-500"
																type="button"
																onClick={() => {
																	void deleteChatThread(thread.id).then(() => {
																		setPendingDeleteId(null);
																		onThreadDeleted(thread.id);
																		void reloadThreads();
																	});
																}}
															>
																Delete
															</button>
															<button
																className={cn('text-[10px] uppercase tracking-[0.1em]', theme.statusText)}
																type="button"
																onClick={() => setPendingDeleteId(null)}
															>
																Cancel
															</button>
														</div>
													</div>
												) : editingId === thread.id ? (
													<form
														className="px-1 py-1"
														onSubmit={(event) => {
															event.preventDefault();
															saveTitle(thread, editTitle);
														}}
													>
														<input
															autoFocus
															className={inputClass}
															value={editTitle}
															onBlur={() => saveTitle(thread, editTitle)}
															onChange={(event) => setEditTitle(event.target.value)}
															onKeyDown={(event) => {
																event.stopPropagation();
																if (event.key === 'Escape') {
																	setEditingId(null);
																	setEditTitle('');
																}
															}}
														/>
													</form>
												) : (
													<div className="flex items-center gap-0.5">
														<button
															className={cn(
																'min-w-0 flex-1 truncate px-2 py-1.5 text-left text-xs',
																thread.id === activeThreadId ? 'font-medium' : theme.statusText,
															)}
															type="button"
															onClick={() => {
																onSelectThread(thread.id, thread.title);
																setOpen(false);
																setQuery('');
															}}
														>
															<span className="block truncate">{thread.title}</span>
															<span className={cn('text-[10px] tabular-nums', theme.statusText)}>
																{formatRelativeTime(thread.updatedAt)}
															</span>
														</button>
														<button
															aria-label="Rename chat"
															className={cn(
																'shrink-0 rounded p-1 opacity-0 transition group-hover:opacity-100',
																theme.statusText,
															)}
															type="button"
															onClick={(event) => {
																event.stopPropagation();
																setEditingId(thread.id);
																setEditTitle(thread.title);
															}}
														>
															<Pencil size={11} />
														</button>
														<button
															aria-label="Delete chat"
															className={cn(
																'shrink-0 rounded p-1 opacity-0 transition group-hover:opacity-100',
																'text-muted-foreground hover:text-red-500',
															)}
															type="button"
															onClick={(event) => {
																event.stopPropagation();
																setPendingDeleteId(thread.id);
															}}
														>
															<Trash2 size={11} />
														</button>
													</div>
												)}
											</div>
										))}
									</div>
								))}
							</div>
						))
					)}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
