import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { listChatThreads, type AiChatThread } from '../../utils/ai-memory-storage';

interface AiChatThreadListProps {
	documentId: string;
	activeThreadId: string | null;
	isDark: boolean;
	onSelectThread: (threadId: string) => void;
	refreshKey: number;
}

export function AiChatThreadList({ documentId, activeThreadId, isDark, onSelectThread, refreshKey }: AiChatThreadListProps) {
	const [threads, setThreads] = useState<AiChatThread[]>([]);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		void listChatThreads(documentId).then(setThreads);
	}, [documentId, refreshKey]);

	const activeThread = threads.find((thread) => thread.id === activeThreadId);
	const buttonClass = isDark
		? 'inline-flex max-w-[10rem] items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300 hover:border-slate-500'
		: 'inline-flex max-w-[10rem] items-center gap-1 rounded-md border border-stone-300 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-stone-600 hover:border-stone-400';
	const menuClass = isDark
		? 'absolute left-0 top-full z-20 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl'
		: 'absolute left-0 top-full z-20 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border border-stone-300 bg-white py-1 shadow-xl';

	return (
		<div className="relative">
			<button className={buttonClass} type="button" onClick={() => setOpen((current) => !current)}>
				<span className="truncate">{activeThread?.title ?? 'Threads'}</span>
				<ChevronDown size={12} />
			</button>

			{open ? (
				<div className={menuClass}>
					{threads.length === 0 ? (
						<p className={`px-3 py-2 text-xs ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>No conversations yet.</p>
					) : (
						threads.map((thread) => (
							<button
								key={thread.id}
								className={`block w-full truncate px-3 py-2 text-left text-sm ${
									thread.id === activeThreadId
										? isDark
											? 'bg-slate-800 text-amber-200'
											: 'bg-amber-50 text-stone-900'
										: isDark
											? 'text-slate-300 hover:bg-slate-800'
											: 'text-stone-700 hover:bg-stone-50'
								}`}
								type="button"
								onClick={() => {
									onSelectThread(thread.id);
									setOpen(false);
								}}
							>
								{thread.title}
							</button>
						))
					)}
				</div>
			) : null}
		</div>
	);
}
