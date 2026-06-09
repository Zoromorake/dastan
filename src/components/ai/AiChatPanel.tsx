import { useCallback, useEffect, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { Plus, Settings2, X } from 'lucide-react';
import type { ScreenplayWorkspaceData } from '../../types';
import { useAiChat } from '../../hooks/useAiChat';
import type { AiChatThread } from '../../utils/ai-memory-storage';
import { AiChatInput } from './AiChatInput';
import { AiChatMessages } from './AiChatMessages';
import { AiChatThreadList } from './AiChatThreadList';
import { AiMemoryDrawer } from './AiMemoryDrawer';

interface AiChatPanelProps {
	open: boolean;
	documentId: string;
	documentTitle: string;
	documentContent: JSONContent | null;
	workspace: ScreenplayWorkspaceData;
	resolvedTheme: 'light' | 'dark';
	onClose: () => void;
	onOpenSettings?: () => void;
}

export function AiChatPanel({
	open,
	documentId,
	documentTitle,
	documentContent,
	workspace,
	resolvedTheme,
	onClose,
	onOpenSettings,
}: AiChatPanelProps) {
	const isDark = resolvedTheme === 'dark';
	const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
	const [threadRefreshKey, setThreadRefreshKey] = useState(0);
	const [memoryDrawerOpen, setMemoryDrawerOpen] = useState(false);

	const handleThreadChange = useCallback((thread: AiChatThread) => {
		setActiveThreadId(thread.id);
		setThreadRefreshKey((current) => current + 1);
	}, []);

	const handleThreadCreated = useCallback((thread: AiChatThread) => {
		setActiveThreadId(thread.id);
		setThreadRefreshKey((current) => current + 1);
	}, []);

	const chat = useAiChat({
		documentId,
		documentTitle,
		documentContent,
		workspace,
		threadId: activeThreadId,
		onThreadChange: handleThreadChange,
		onThreadCreated: handleThreadCreated,
	});

	useEffect(() => {
		if (open) {
			chat.refreshSettings();
		}
	}, [chat.refreshSettings, open]);

	useEffect(() => {
		if (!open) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') {
				return;
			}

			if (memoryDrawerOpen) {
				setMemoryDrawerOpen(false);
				return;
			}

			onClose();
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [memoryDrawerOpen, onClose, open]);

	if (!open) {
		return null;
	}

	const panelClass = isDark
		? 'fixed right-0 top-28 bottom-0 z-50 flex w-[24rem] flex-col overflow-hidden border-l border-slate-700 bg-slate-800 shadow-[-20px_0_60px_rgba(0,0,0,0.35)]'
		: 'fixed right-0 top-28 bottom-0 z-50 flex w-[24rem] flex-col overflow-hidden border-l border-stone-300 bg-[#f6f2ea] shadow-[-20px_0_60px_rgba(28,25,23,0.12)]';

	return (
		<aside className={panelClass} aria-label="AI chat">
			<div className={`relative z-0 flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 ${isDark ? 'border-slate-700' : 'border-stone-300'}`}>
				<div className="flex min-w-0 items-center gap-2">
					<button
						className={`rounded-md border p-1.5 ${isDark ? 'border-slate-600 text-slate-300 hover:text-white' : 'border-stone-300 text-stone-600 hover:text-stone-900'}`}
						type="button"
						title="New chat"
						onClick={() => {
							setActiveThreadId(null);
							void chat.startNewThread();
						}}
					>
						<Plus size={14} />
					</button>
					<AiChatThreadList
						documentId={documentId}
						activeThreadId={activeThreadId}
						isDark={isDark}
						refreshKey={threadRefreshKey}
						onSelectThread={(threadId) => {
							void chat.selectThread(threadId);
						}}
					/>
				</div>

				<div className="flex items-center gap-1">
					<button
						className={`rounded-md border p-1.5 ${isDark ? 'border-slate-600 text-slate-300 hover:text-white' : 'border-stone-300 text-stone-600 hover:text-stone-900'}`}
						type="button"
						title="Memories"
						onClick={() => setMemoryDrawerOpen(true)}
					>
						<Settings2 size={14} />
					</button>
					{onOpenSettings ? (
						<button
							className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${isDark ? 'border-slate-600 text-slate-300' : 'border-stone-300 text-stone-600'}`}
							type="button"
							onClick={() => {
								setMemoryDrawerOpen(false);
								onOpenSettings();
							}}
						>
							AI Settings
						</button>
					) : null}
					<button
						className={`rounded-md border p-1.5 ${isDark ? 'border-slate-600 text-slate-300 hover:text-white' : 'border-stone-300 text-stone-600 hover:text-stone-900'}`}
						type="button"
						aria-label="Close chat"
						onClick={onClose}
					>
						<X size={14} />
					</button>
				</div>
			</div>

			<div className="relative z-0 min-h-0 flex-1 overflow-y-auto">
				<AiChatMessages
					messages={chat.messages}
					status={chat.status}
					isDark={isDark}
					onRegenerate={() => {
						void chat.regenerate();
					}}
				/>
			</div>

			{chat.error ? (
				<div className={`border-t px-4 py-2 text-xs text-red-500 ${isDark ? 'border-slate-700' : 'border-stone-300'}`}>
					{chat.error.message}
				</div>
			) : null}

			<div className="relative z-0 shrink-0">
				<AiChatInput
					isDark={isDark}
					settings={chat.settings}
					selectedModel={chat.selectedModel}
					includeScriptContext={chat.includeScriptContext}
					includeWorkspaceContext={chat.includeWorkspaceContext}
					status={chat.status}
					onModelChange={chat.setSelectedModel}
					onIncludeScriptContextChange={chat.setIncludeScriptContext}
					onIncludeWorkspaceContextChange={chat.setIncludeWorkspaceContext}
					onSubmit={chat.submitMessage}
					onStop={chat.stop}
				/>
			</div>

			<AiMemoryDrawer
				open={memoryDrawerOpen}
				isDark={isDark}
				documentId={documentId}
				memories={chat.memories}
				onClose={() => setMemoryDrawerOpen(false)}
				onMemoriesChange={() => {
					void chat.reloadMemories();
				}}
			/>
		</aside>
	);
}
