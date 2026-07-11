import { memo, useCallback, useState, type ReactNode } from 'react';
import type { UIMessage } from 'ai';
import { Bookmark, Check, Copy, CornerDownLeft, Pencil, Replace, RotateCcw, Undo2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { resolveModelOption } from '../../utils/ai-models';
import type { AiMemory } from '../../utils/ai-memory-storage';
import type { MemorySuggestion } from '../../hooks/useAiChat';
import { AiToolCallCard } from './AiToolCallCard';
import { ScreenplayBlock } from './ScreenplayBlock';
import { buildToolActivityLabel, type ToolPreviewState } from '../../utils/ai-tool-preview';
import { looksLikeScreenplayReply, splitAssistantContent } from '../../utils/ai-reply-screenplay';

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
	firstLibraryTitle?: string;
	onRegenerate?: () => void;
	onEditMessage?: (messageId: string, newText: string) => Promise<boolean>;
	onStarterClick?: (text: string) => void;
	selectionActive?: boolean;
	onInsertText?: (text: string) => void;
	onInsertScreenplayChunk?: (text: string) => void;
	onReplaceSelection?: (text: string) => void;
	autoInsertedMessageId?: string | null;
	onUndoAutoInsert?: () => void;
	memorySuggestions?: MemorySuggestion[];
	onApproveMemory?: (id: string, scope: AiMemory['scope']) => Promise<void>;
	onDismissMemory?: (id: string) => void;
	messageToolPreviews?: Record<string, ToolPreviewState[]>;
	onAcceptTool?: (toolId: string) => void;
	onRejectTool?: (toolId: string) => void;
}

/** Stable across renders — recreating these remounts markdown DOM and kills text selection. */
const markdownComponents = {
	p: ({ children }: { children?: ReactNode }) => (
		<p className="ai-chat-md-p my-2 leading-6 first:mt-0 last:mb-0">{children}</p>
	),
	ul: ({ children }: { children?: ReactNode }) => (
		<ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
	),
	ol: ({ children }: { children?: ReactNode }) => (
		<ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
	),
	li: ({ children }: { children?: ReactNode }) => <li className="leading-6">{children}</li>,
	strong: ({ children }: { children?: ReactNode }) => <strong className="font-semibold">{children}</strong>,
	em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
	code: ({ children }: { children?: ReactNode }) => <code className="ai-chat-md-code">{children}</code>,
	pre: ({ children }: { children?: ReactNode }) => <pre className="ai-chat-md-pre">{children}</pre>,
	h1: ({ children }: { children?: ReactNode }) => <h3 className="mt-3 text-base font-semibold">{children}</h3>,
	h2: ({ children }: { children?: ReactNode }) => <h4 className="mt-2 text-sm font-semibold">{children}</h4>,
	h3: ({ children }: { children?: ReactNode }) => <h5 className="mt-2 text-sm font-medium">{children}</h5>,
};

const AssistantMarkdown = memo(function AssistantMarkdown({ text }: { text: string }) {
	return <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>;
});

function getMessageText(message: UIMessage): string {
	return message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join('');
}

function formatUsedModelLabel(message: UIMessage): string | null {
	const meta = message as UIMessage & { modelId?: string; modelSelection?: string };
	const resolvedId = meta.modelId?.trim();

	if (!resolvedId) {
		return null;
	}

	return resolveModelOption(resolvedId)?.label ?? resolvedId;
}

function ThinkingDots({ isDark }: { isDark: boolean }) {
	return (
		<span aria-label="Assistant is thinking" className="inline-flex items-center gap-1.5 py-1">
			{[0, 1, 2].map((index) => (
				<span
					key={index}
					className={`size-1.5 rounded-full animate-bounce ${isDark ? 'bg-slate-400' : 'bg-stone-400'}`}
					style={{ animationDelay: `${index * 150}ms` }}
				/>
			))}
		</span>
	);
}

function isAwaitingAssistantReply(
	messages: UIMessage[],
	status: AiChatMessagesProps['status'],
): boolean {
	if (status !== 'submitted' && status !== 'streaming') {
		return false;
	}

	const lastMessage = messages.at(-1);
	return !lastMessage || lastMessage.role === 'user';
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
			className={`rounded-xl border px-3 py-2.5 ai-chat-chrome ${
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

interface ChatMessageRowProps {
	message: UIMessage;
	isDark: boolean;
	status: AiChatMessagesProps['status'];
	isLastAssistant: boolean;
	isStreamingAssistant: boolean;
	wasAutoInserted: boolean;
	selectionActive: boolean;
	toolPreviews: ToolPreviewState[];
	editingId: string | null;
	editDraft: string;
	onEditDraftChange: (value: string) => void;
	onStartEdit: (messageId: string, text: string) => void;
	onCancelEdit: () => void;
	onEditMessage?: (messageId: string, newText: string) => Promise<boolean>;
	onRegenerate?: () => void;
	onInsertText?: (text: string) => void;
	onInsertScreenplayChunk?: (text: string) => void;
	onReplaceSelection?: (text: string) => void;
	onUndoAutoInsert?: () => void;
	onAcceptTool?: (toolId: string) => void;
	onRejectTool?: (toolId: string) => void;
}

const ChatMessageRow = memo(function ChatMessageRow({
	message,
	isDark,
	status,
	isLastAssistant,
	isStreamingAssistant,
	wasAutoInserted,
	selectionActive,
	toolPreviews,
	editingId,
	editDraft,
	onEditDraftChange,
	onStartEdit,
	onCancelEdit,
	onEditMessage,
	onRegenerate,
	onInsertText,
	onInsertScreenplayChunk,
	onReplaceSelection,
	onUndoAutoInsert,
	onAcceptTool,
	onRejectTool,
}: ChatMessageRowProps) {
	const text = getMessageText(message);
	const isUser = message.role === 'user';
	const isEditing = editingId === message.id;
	const showStreamingCursor = isStreamingAssistant && isLastAssistant && text.trim().length > 0;
	const showThinkingInline =
		!isUser && isLastAssistant && (status === 'submitted' || status === 'streaming') && text.trim().length === 0;
	const toolActivityLabel =
		!isUser && isLastAssistant && (status === 'streaming' || status === 'submitted')
			? buildToolActivityLabel(toolPreviews)
			: null;
	const contentSegments =
		!isUser && text.trim()
			? splitAssistantContent(text, {
					streaming: isStreamingAssistant && isLastAssistant,
				})
			: [];
	const hasScreenplaySegments = contentSegments.some((segment) => segment.kind === 'screenplay');
	const entireMessageIsScreenplay =
		hasScreenplaySegments && contentSegments.every((segment) => segment.kind === 'screenplay');
	const usedModelLabel = !isUser ? formatUsedModelLabel(message) : null;
	const mutedClass = isDark ? 'text-slate-500' : 'text-stone-500';
	const actionBtnClass = isDark
		? 'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-slate-500 transition hover:bg-white/5 hover:text-slate-200'
		: 'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-stone-500 transition hover:bg-stone-100 hover:text-stone-800';
	const userPromptClass = isDark
		? 'rounded-xl border border-white/10 bg-white/[0.04] text-slate-100'
		: 'rounded-xl border border-stone-200/90 bg-white text-stone-900 shadow-sm';

	if (isUser) {
		return (
			<div className="w-full">
				<div className={`group relative px-3.5 py-3 text-sm leading-6 ${userPromptClass}`}>
					{isEditing ? (
						<div className="space-y-2">
							<textarea
								className={`min-h-20 w-full resize-y rounded-lg border bg-transparent px-2 py-1.5 text-sm outline-none ${
									isDark ? 'border-slate-600 text-slate-100' : 'border-stone-300 text-stone-900'
								}`}
								value={editDraft}
								onChange={(event) => onEditDraftChange(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter' && !event.shiftKey) {
										event.preventDefault();
										void onEditMessage?.(message.id, editDraft).then((success) => {
											if (success) {
												onCancelEdit();
											}
										});
									}
								}}
							/>
							<div className="flex items-center gap-2 ai-chat-chrome">
								<button
									className={actionBtnClass}
									type="button"
									onClick={() => {
										void onEditMessage?.(message.id, editDraft).then((success) => {
											if (success) {
												onCancelEdit();
											}
										});
									}}
								>
									<Check size={12} />
									Resend
								</button>
								<button className={actionBtnClass} type="button" onClick={onCancelEdit}>
									<X size={12} />
									Cancel
								</button>
							</div>
						</div>
					) : (
						<>
							<div className="ai-chat-selectable whitespace-pre-wrap pr-6">{text}</div>
							{onEditMessage && status === 'ready' ? (
								<button
									aria-label="Edit message"
									className={`absolute bottom-2 right-2 rounded-md p-1 opacity-0 transition ai-chat-chrome group-hover:opacity-100 ${mutedClass} hover:bg-black/10 hover:text-foreground`}
									type="button"
									onMouseDown={(event) => event.preventDefault()}
									onClick={() => onStartEdit(message.id, text)}
								>
									<Pencil size={12} />
								</button>
							) : null}
						</>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="w-full">
			{text.trim() ? (
				<div
					className={`ai-chat-selectable text-sm leading-6 ${isDark ? 'text-slate-200' : 'text-stone-800'}`}
					data-ai-chat-dark={isDark ? 'true' : 'false'}
				>
					{contentSegments.map((segment, index) =>
						segment.kind === 'screenplay' ? (
							<ScreenplayBlock
								key={`screenplay-${index}`}
								text={segment.text}
								isDark={isDark}
								onInsert={
									onInsertScreenplayChunk ? () => onInsertScreenplayChunk(segment.text) : undefined
								}
							/>
						) : (
							<AssistantMarkdown key={`markdown-${index}`} text={segment.text} />
						),
					)}
				</div>
			) : null}
			{showThinkingInline ? (
				<div className="ai-chat-chrome">
					<ThinkingDots isDark={isDark} />
				</div>
			) : showStreamingCursor ? (
				<span className={`inline-block animate-pulse ai-chat-chrome ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
					▋
				</span>
			) : null}

			{wasAutoInserted ? (
				<div
					className={`mt-3 flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] ai-chat-chrome ${
						isDark
							? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-200'
							: 'border-emerald-300 bg-emerald-50 text-emerald-800'
					}`}
				>
					<Check size={12} />
					Inserted into script
					{onUndoAutoInsert ? (
						<button
							className={`ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-1 ${
								isDark
									? 'border-emerald-700 text-emerald-100 hover:bg-emerald-900/40'
									: 'border-emerald-400 text-emerald-900 hover:bg-emerald-100'
							}`}
							type="button"
							onClick={onUndoAutoInsert}
						>
							<Undo2 size={12} />
							Undo
						</button>
					) : null}
				</div>
			) : null}

			{!showThinkingInline ? (
				<div className="mt-2 flex flex-wrap items-center gap-0.5 ai-chat-chrome">
					{usedModelLabel ? (
						<span className={`mr-1 px-1.5 py-1 text-[11px] tabular-nums ${mutedClass}`}>{usedModelLabel}</span>
					) : null}
					<button
						className={actionBtnClass}
						type="button"
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => void navigator.clipboard.writeText(text)}
					>
						<Copy size={12} />
						Copy
					</button>
					{onInsertText && !entireMessageIsScreenplay ? (
						<button
							className={actionBtnClass}
							type="button"
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => {
								if (onInsertScreenplayChunk && looksLikeScreenplayReply(text)) {
									onInsertScreenplayChunk(text);
									return;
								}

								onInsertText(text);
							}}
						>
							<CornerDownLeft size={12} />
							Insert
						</button>
					) : null}
					{selectionActive && onReplaceSelection ? (
						<button
							className={actionBtnClass}
							type="button"
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => onReplaceSelection(text)}
						>
							<Replace size={12} />
							Replace
						</button>
					) : null}
					{isLastAssistant && status === 'ready' && onRegenerate ? (
						<button
							className={actionBtnClass}
							type="button"
							onMouseDown={(event) => event.preventDefault()}
							onClick={onRegenerate}
						>
							<RotateCcw size={12} />
							Retry
						</button>
					) : null}
				</div>
			) : null}

			{toolActivityLabel ? (
				<p className={`mt-3 text-[11px] tabular-nums ai-chat-chrome ${mutedClass}`}>{toolActivityLabel}</p>
			) : null}

			{toolPreviews.length > 0 ? (
				<div className={`${toolActivityLabel ? 'mt-2' : 'mt-3'} space-y-2 ai-chat-chrome`}>
					{toolPreviews.map((preview) => (
						<AiToolCallCard
							key={preview.id}
							isDark={isDark}
							preview={preview}
							onAccept={onAcceptTool ? () => onAcceptTool(preview.id) : undefined}
							onReject={onRejectTool ? () => onRejectTool(preview.id) : undefined}
						/>
					))}
				</div>
			) : null}
		</div>
	);
});

export function AiChatMessages({
	messages,
	status,
	isDark,
	variant,
	isLongConversation = false,
	firstLibraryTitle,
	onRegenerate,
	onEditMessage,
	onStarterClick,
	selectionActive = false,
	onInsertText,
	onInsertScreenplayChunk,
	onReplaceSelection,
	autoInsertedMessageId = null,
	onUndoAutoInsert,
	memorySuggestions = [],
	onApproveMemory,
	onDismissMemory,
	messageToolPreviews = {},
	onAcceptTool,
	onRejectTool,
}: AiChatMessagesProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editDraft, setEditDraft] = useState('');

	const handleStartEdit = useCallback((messageId: string, text: string) => {
		setEditingId(messageId);
		setEditDraft(text);
	}, []);

	const handleCancelEdit = useCallback(() => {
		setEditingId(null);
		setEditDraft('');
	}, []);

	const mutedClass = isDark ? 'text-slate-500' : 'text-stone-500';
	const starters = getStarterPrompts(variant, firstLibraryTitle);
	const emptyHeading = variant === 'hub' ? 'What can I help with?' : 'Ask about your screenplay';

	if (messages.length === 0) {
		if (isAwaitingAssistantReply(messages, status)) {
			return (
				<div className="px-4 py-4 ai-chat-chrome">
					<ThinkingDots isDark={isDark} />
				</div>
			);
		}

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
	const isStreamingAssistant = status === 'streaming' && lastMessage?.role === 'assistant';
	const awaitingAssistantReply = isAwaitingAssistantReply(messages, status);
	const showMemorySuggestions =
		status === 'ready' &&
		lastMessage?.role === 'assistant' &&
		memorySuggestions.length > 0 &&
		onApproveMemory &&
		onDismissMemory;

	return (
		<div className="space-y-6 px-4 py-4" data-ai-chat-dark={isDark ? 'true' : 'false'}>
			{isLongConversation ? (
				<div
					className={`rounded-lg border px-3 py-2 text-xs ai-chat-chrome ${
						isDark ? 'border-amber-800/50 bg-amber-950/20 text-amber-200/90' : 'border-amber-200 bg-amber-50 text-amber-900'
					}`}
				>
					This conversation is getting long. Start a new thread for sharper answers on a fresh topic.
				</div>
			) : null}

			{messages.map((message) => (
				<ChatMessageRow
					key={message.id}
					message={message}
					isDark={isDark}
					status={status}
					isLastAssistant={message.role !== 'user' && message.id === lastMessage?.id}
					isStreamingAssistant={isStreamingAssistant}
					wasAutoInserted={message.id === autoInsertedMessageId}
					selectionActive={selectionActive}
					toolPreviews={message.role !== 'user' ? messageToolPreviews[message.id] ?? [] : []}
					editingId={editingId}
					editDraft={editDraft}
					onEditDraftChange={setEditDraft}
					onStartEdit={handleStartEdit}
					onCancelEdit={handleCancelEdit}
					onEditMessage={onEditMessage}
					onRegenerate={onRegenerate}
					onInsertText={onInsertText}
					onInsertScreenplayChunk={onInsertScreenplayChunk}
					onReplaceSelection={onReplaceSelection}
					onUndoAutoInsert={onUndoAutoInsert}
					onAcceptTool={onAcceptTool}
					onRejectTool={onRejectTool}
				/>
			))}

			{awaitingAssistantReply ? (
				<div className="w-full ai-chat-chrome">
					<ThinkingDots isDark={isDark} />
				</div>
			) : null}

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
