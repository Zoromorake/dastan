import { useEffect, useState } from 'react';
import type { UIMessage } from 'ai';
import { Bookmark, Check, Copy, CornerDownLeft, Pencil, Replace, RotateCcw, Undo2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AUTO_MODEL_ID } from '../../utils/ai-models';
import type { AiMemory } from '../../utils/ai-memory-storage';
import type { MemorySuggestion } from '../../hooks/useAiChat';

interface StarterPrompt {
	label: string;
	prompt: string;
}

interface AiChatMessagesProps {
	messages: UIMessage[];
	status: 'submitted' | 'streaming' | 'ready' | 'error';
	isDark: boolean;
	variant: 'hub' | 'editor';
	isLongConversation?: boolean;
	selectedModel: string;
	availableModels: Array<{ id: string; label: string }>;
	firstLibraryTitle?: string;
	onRegenerate?: () => void;
	onRegenerateWithModel?: (modelId: string) => void;
	onEditMessage?: (messageId: string, newText: string) => Promise<boolean>;
	onStarterClick?: (text: string) => void;
	selectionActive?: boolean;
	onInsertText?: (text: string) => void;
	onReplaceSelection?: (text: string) => void;
	/** Id of the assistant message that was automatically inserted into the script (Writer mode). */
	autoInsertedMessageId?: string | null;
	onUndoAutoInsert?: () => void;
	memorySuggestions?: MemorySuggestion[];
	onApproveMemory?: (id: string, scope: AiMemory['scope']) => Promise<void>;
	onDismissMemory?: (id: string) => void;
}

function getMessageText(message: UIMessage): string {
	return message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join('');
}

function getStarterPrompts(variant: 'hub' | 'editor', firstLibraryTitle?: string): StarterPrompt[] {
	if (variant === 'hub') {
		const loglineTarget = firstLibraryTitle?.trim() || 'a new idea';

		return [
			{ label: 'Compare my scripts by genre', prompt: 'Compare my scripts by genre and highlight which ones feel most market-ready.' },
			{
				label: `Suggest a logline for ${loglineTarget}`,
				prompt: `Suggest a strong logline for "${loglineTarget}". Give me three options with different angles.`,
			},
			{ label: 'Help me plan my next project', prompt: 'Help me plan my next project — what should I clarify before I start writing?' },
		];
	}

	return [
		{ label: 'Give me notes on this scene', prompt: 'Give me notes on this scene — what is working and what could be sharper?' },
		{ label: 'Suggest alternative dialogue', prompt: 'Suggest alternative dialogue for my current selection that keeps the same intent but feels more alive.' },
		{
			label: "What's my story's biggest structural weakness?",
			prompt: "Based on the script and workspace context, what is this story's biggest structural weakness right now?",
		},
	];
}

interface MemorySuggestionCardProps {
	suggestion: MemorySuggestion;
	isDark: boolean;
	onApprove: (id: string, scope: AiMemory['scope']) => Promise<void>;
	onDismiss: (id: string) => void;
}

function MemorySuggestionCard({ suggestion, isDark, onApprove, onDismiss }: MemorySuggestionCardProps) {
	const [selectedScope, setSelectedScope] = useState<AiMemory['scope']>(suggestion.suggestedScope);
	const [isSaving, setIsSaving] = useState(false);

	const scopeOptions: Array<{ value: AiMemory['scope']; label: string }> = [
		{ value: 'document', label: 'Script' },
		{ value: 'project', label: 'Project' },
		{ value: 'global', label: 'Global' },
	];

	return (
		<div
			className={`rounded-xl border px-3 py-2.5 ${
				isDark ? 'border-amber-800/40 bg-amber-950/25 text-amber-50' : 'border-amber-200 bg-amber-50 text-amber-950'
			}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em]">
					<Bookmark size={12} />
					Remember this?
				</div>
				<button
					aria-label="Dismiss memory suggestion"
					className={`rounded p-0.5 ${isDark ? 'text-amber-300/70 hover:text-amber-100' : 'text-amber-700/70 hover:text-amber-950'}`}
					type="button"
					onClick={() => onDismiss(suggestion.id)}
				>
					<X size={12} />
				</button>
			</div>

			<p className="mt-1.5 line-clamp-2 text-sm leading-5">{suggestion.text}</p>

			<div className="mt-2 flex flex-wrap items-center gap-2">
				<div
					className={`inline-flex overflow-hidden rounded-md border text-[10px] uppercase tracking-[0.12em] ${
						isDark ? 'border-amber-800/50' : 'border-amber-300'
					}`}
				>
					{scopeOptions.map((option) => (
						<button
							key={option.value}
							className={`px-2 py-1 ${
								selectedScope === option.value
									? isDark
										? 'bg-amber-900/60 text-amber-100'
										: 'bg-amber-200 text-amber-950'
									: isDark
										? 'text-amber-300/80 hover:bg-amber-950/40'
										: 'text-amber-800/80 hover:bg-amber-100'
							}`}
							type="button"
							onClick={() => setSelectedScope(option.value)}
						>
							{option.label}
						</button>
					))}
				</div>

				<button
					className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
						isDark ? 'border-amber-700 text-amber-200' : 'border-amber-400 text-stone-900'
					}`}
					disabled={isSaving}
					type="button"
					onClick={() => {
						setIsSaving(true);
						void onApprove(suggestion.id, selectedScope).finally(() => setIsSaving(false));
					}}
				>
					<Check size={12} />
					Save
				</button>
			</div>
		</div>
	);
}

export function AiChatMessages({
	messages,
	status,
	isDark,
	variant,
	isLongConversation = false,
	selectedModel,
	availableModels,
	firstLibraryTitle,
	onRegenerate,
	onRegenerateWithModel,
	onEditMessage,
	onStarterClick,
	selectionActive = false,
	onInsertText,
	onReplaceSelection,
	autoInsertedMessageId = null,
	onUndoAutoInsert,
	memorySuggestions = [],
	onApproveMemory,
	onDismissMemory,
}: AiChatMessagesProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editDraft, setEditDraft] = useState('');
	const [retryModel, setRetryModel] = useState(selectedModel);

	useEffect(() => {
		setRetryModel(selectedModel);
	}, [selectedModel]);

	const bubbleUser = isDark ? 'bg-amber-950/50 text-amber-50' : 'bg-amber-50 text-stone-900';
	const bubbleAssistant = isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-stone-800';
	const mutedClass = isDark ? 'text-slate-500' : 'text-stone-500';
	const starters = getStarterPrompts(variant, firstLibraryTitle);
	const emptyHeading = variant === 'hub' ? 'What can I help with?' : 'Ask about your screenplay';

	const selectClass = isDark
		? 'rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300'
		: 'rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] text-stone-600';

	const markdownComponents = {
		p: ({ children }: { children?: React.ReactNode }) => <p className="my-2 leading-6">{children}</p>,
		ul: ({ children }: { children?: React.ReactNode }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
		ol: ({ children }: { children?: React.ReactNode }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
		li: ({ children }: { children?: React.ReactNode }) => <li className="leading-6">{children}</li>,
		strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
		em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
		code: ({ children }: { children?: React.ReactNode }) => (
			<code
				className={`rounded px-1 py-0.5 font-mono text-[0.85em] ${
					isDark ? 'bg-slate-950/60 text-amber-200' : 'bg-stone-100 text-stone-900'
				}`}
			>
				{children}
			</code>
		),
		pre: ({ children }: { children?: React.ReactNode }) => (
			<pre
				className={`my-2 overflow-x-auto rounded-lg p-3 font-mono text-xs leading-5 ${
					isDark ? 'bg-slate-950/60 text-slate-200' : 'bg-stone-100 text-stone-900'
				}`}
			>
				{children}
			</pre>
		),
		h1: ({ children }: { children?: React.ReactNode }) => <h3 className="mt-3 text-base font-semibold">{children}</h3>,
		h2: ({ children }: { children?: React.ReactNode }) => <h4 className="mt-2 text-sm font-semibold">{children}</h4>,
		h3: ({ children }: { children?: React.ReactNode }) => <h5 className="mt-2 text-sm font-medium">{children}</h5>,
	};

	if (messages.length === 0) {
		return (
			<div className={`flex h-full flex-col items-center justify-center px-6 py-8 text-center ${mutedClass}`}>
				<p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-stone-800'}`}>{emptyHeading}</p>
				{onStarterClick ? (
					<div className="mt-6 flex w-full max-w-xs flex-col gap-2">
						{starters.map((starter) => (
							<button
								key={starter.label}
								className={`rounded-full border px-3 py-2 text-left text-sm transition ${
									isDark
										? 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-600'
										: 'border-stone-300 bg-white text-stone-800 hover:border-amber-300'
								}`}
								type="button"
								onClick={() => onStarterClick(starter.prompt)}
							>
								{starter.label}
							</button>
						))}
					</div>
				) : null}
			</div>
		);
	}

	const lastMessage = messages[messages.length - 1];
	const isStreamingAssistant =
		status === 'streaming' && lastMessage?.role === 'assistant';
	const showMemorySuggestions =
		status === 'ready' &&
		lastMessage?.role === 'assistant' &&
		memorySuggestions.length > 0 &&
		onApproveMemory &&
		onDismissMemory;

	return (
		<div className="space-y-4 px-4 py-4">
			{isLongConversation ? (
				<div
					className={`rounded-lg border px-3 py-2 text-xs ${
						isDark ? 'border-amber-800/50 bg-amber-950/20 text-amber-200/90' : 'border-amber-200 bg-amber-50 text-amber-900'
					}`}
				>
					This conversation is getting long. Start a new thread for sharper answers on a fresh topic.
				</div>
			) : null}

			{messages.map((message) => {
				const text = getMessageText(message);
				const isUser = message.role === 'user';
				const isLastAssistant = !isUser && message.id === lastMessage?.id;
				const isEditing = editingId === message.id;
				const showStreamingCursor = isStreamingAssistant && isLastAssistant;
				const wasAutoInserted = !isUser && message.id === autoInsertedMessageId;

				return (
					<div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
						<div className={`max-w-[92%] rounded-2xl px-3 py-2.5 text-sm leading-6 ${isUser ? bubbleUser : bubbleAssistant}`}>
							<div className={`mb-1 text-[10px] uppercase tracking-[0.16em] ${mutedClass}`}>
								{isUser ? 'You' : 'Assistant'}
							</div>

							{isEditing ? (
								<div className="space-y-2">
									<textarea
										className={`min-h-20 w-full resize-y rounded-lg border px-2 py-1.5 text-sm outline-none ${
											isDark ? 'border-slate-600 bg-slate-950 text-slate-100' : 'border-stone-300 bg-white text-stone-900'
										}`}
										value={editDraft}
										onChange={(event) => setEditDraft(event.target.value)}
										onKeyDown={(event) => {
											if (event.key === 'Enter' && !event.shiftKey) {
												event.preventDefault();
												void onEditMessage?.(message.id, editDraft).then((success) => {
													if (success) {
														setEditingId(null);
														setEditDraft('');
													}
												});
											}
										}}
									/>
									<div className="flex items-center gap-2">
										<button
											className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
												isDark ? 'border-amber-700 text-amber-200' : 'border-amber-400 text-stone-900'
											}`}
											type="button"
											onClick={() => {
												void onEditMessage?.(message.id, editDraft).then((success) => {
													if (success) {
														setEditingId(null);
														setEditDraft('');
													}
												});
											}}
										>
											<Check size={12} />
											Resend
										</button>
										<button
											className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
												isDark ? 'border-slate-700 text-slate-400' : 'border-stone-200 text-stone-500'
											}`}
											type="button"
											onClick={() => {
												setEditingId(null);
												setEditDraft('');
											}}
										>
											<X size={12} />
											Cancel
										</button>
									</div>
								</div>
							) : isUser ? (
								<div className="whitespace-pre-wrap">{text}</div>
							) : (
								<div className={`space-y-2 ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>
									<ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
									{showStreamingCursor ? (
										<span className={`inline-block animate-pulse ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>▋</span>
									) : null}
								</div>
							)}

							{!isUser && !isEditing && wasAutoInserted ? (
								<div
									className={`mt-2 flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] ${
										isDark ? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-200' : 'border-emerald-300 bg-emerald-50 text-emerald-800'
									}`}
								>
									<Check size={12} />
									Inserted into script
									{onUndoAutoInsert ? (
										<button
											className={`ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-1 ${
												isDark ? 'border-emerald-700 text-emerald-100 hover:bg-emerald-900/40' : 'border-emerald-400 text-emerald-900 hover:bg-emerald-100'
											}`}
											type="button"
											onClick={onUndoAutoInsert}
										>
											<Undo2 size={12} />
											Undo
										</button>
									) : null}
								</div>
							) : !isUser && !isEditing ? (
								<div className="mt-2 flex flex-wrap items-center gap-2">
									<button
										className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
											isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-stone-200 text-stone-500 hover:text-stone-800'
										}`}
										type="button"
										onClick={() => void navigator.clipboard.writeText(text)}
									>
										<Copy size={12} />
										Copy
									</button>
									{onInsertText ? (
										<button
											className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
												isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-stone-200 text-stone-500 hover:text-stone-800'
											}`}
											type="button"
											onClick={() => onInsertText(text)}
										>
											<CornerDownLeft size={12} />
											Insert
										</button>
									) : null}
									{selectionActive && onReplaceSelection ? (
										<button
											className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
												isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-stone-200 text-stone-500 hover:text-stone-800'
											}`}
											type="button"
											onClick={() => onReplaceSelection(text)}
										>
											<Replace size={12} />
											Replace Selection
										</button>
									) : null}
									{isLastAssistant && status === 'ready' && onRegenerate ? (
										<>
											<button
												className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
													isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-stone-200 text-stone-500 hover:text-stone-800'
												}`}
												type="button"
												onClick={() => {
													if (retryModel !== selectedModel && onRegenerateWithModel) {
														void onRegenerateWithModel(retryModel);
														return;
													}

													onRegenerate();
												}}
											>
												<RotateCcw size={12} />
												Retry
											</button>
											{availableModels.length > 0 ? (
												<select
													className={selectClass}
													value={retryModel}
													onChange={(event) => setRetryModel(event.target.value)}
													aria-label="Model for retry"
												>
													<option value={AUTO_MODEL_ID}>Auto</option>
													{availableModels.map((model) => (
														<option key={model.id} value={model.id}>
															{model.label}
														</option>
													))}
												</select>
											) : null}
										</>
									) : null}
								</div>
							) : null}

							{isUser && !isEditing && onEditMessage && status === 'ready' ? (
								<div className="mt-2">
									<button
										className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
											isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-stone-200 text-stone-500 hover:text-stone-800'
										}`}
										type="button"
										onClick={() => {
											setEditingId(message.id);
											setEditDraft(text);
										}}
									>
										<Pencil size={12} />
										Edit
									</button>
								</div>
							) : null}
						</div>
					</div>
				);
			})}

			{showMemorySuggestions ? (
				<div className="space-y-2">
					{memorySuggestions.map((suggestion) => (
						<MemorySuggestionCard
							key={suggestion.id}
							isDark={isDark}
							suggestion={suggestion}
							onApprove={onApproveMemory}
							onDismiss={onDismissMemory}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}
