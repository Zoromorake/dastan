import { useEffect, useMemo, useRef, useState } from 'react';
import {
	Brain,
	ChevronDown,
	FileText,
	LayoutGrid,
	ScrollText,
	Send,
	Square,
	TextSelect,
	X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AUTO_MODEL_ID, AI_PROVIDER_LABELS, type AiModelOption } from '../../utils/ai-models';
import type { AiChatContextMode } from '../../hooks/useAiChat';
import type { AiInteractionMode } from '../../utils/ai-interaction-mode';

interface SlashCommand {
	command: string;
	prompt: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
	{ command: '/dialogue', prompt: 'Rewrite the selected dialogue to be sharper and more subtext-driven' },
	{ command: '/notes', prompt: "Give me director's notes on this scene" },
	{ command: '/logline', prompt: 'Write three logline variations for this screenplay' },
	{ command: '/beat', prompt: 'Suggest the next beat based on my current structure' },
	{
		command: '/structure',
		prompt:
			'Review my story structure and tell me which beats are missing, weak, or out of order. Reference my workspace structure beats and scenes.',
	},
	{ command: '/punch', prompt: 'Punch up the energy in this scene' },
];

interface AiChatInputProps {
	isDark: boolean;
	contextMode: AiChatContextMode;
	interactionMode: AiInteractionMode;
	selectedModel: string;
	allModels: AiModelOption[];
	availableModels: Array<{ id: string; label: string }>;
	modelConfigurationError: string | null;
	isModelConfigured: boolean;
	status: 'submitted' | 'streaming' | 'ready' | 'error';
	canSend: boolean;
	hasProviderConfigured: boolean;
	usingCredits: boolean;
	creditsRemaining: number | 'unlimited';
	includeScriptContext: boolean;
	includeWorkspaceContext: boolean;
	selectionActive: boolean;
	memoriesCount: number;
	globalRulesActive: boolean;
	scriptCharCount: number;
	workspaceSummaryCharCount: number;
	onInteractionModeChange: (mode: AiInteractionMode) => void;
	onToggleScript: () => void;
	onToggleWorkspace: () => void;
	onClearSelection: () => void;
	onModelChange: (modelId: string) => void;
	onSubmit: (text: string) => Promise<boolean>;
	onStop: () => void;
}

function formatTokenCount(chars: number): string {
	const tokens = Math.round(chars / 4);

	if (tokens >= 1000) {
		return `${(tokens / 1000).toFixed(1).replace(/\.0$/, '')}k`;
	}

	return String(tokens);
}

function formatCharCount(chars: number): string {
	if (chars >= 1000) {
		return `${(chars / 1000).toFixed(1).replace(/\.0$/, '')}k`;
	}

	return String(chars);
}

export function AiChatInput({
	isDark,
	contextMode,
	interactionMode,
	selectedModel,
	allModels,
	availableModels,
	modelConfigurationError,
	isModelConfigured,
	status,
	canSend,
	hasProviderConfigured,
	usingCredits,
	creditsRemaining,
	includeScriptContext,
	includeWorkspaceContext,
	selectionActive,
	memoriesCount,
	globalRulesActive,
	scriptCharCount,
	workspaceSummaryCharCount,
	onInteractionModeChange,
	onToggleScript,
	onToggleWorkspace,
	onClearSelection,
	onModelChange,
	onSubmit,
	onStop,
}: AiChatInputProps) {
	const [input, setInput] = useState('');
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [slashHighlightIndex, setSlashHighlightIndex] = useState(0);
	const [slashMenuSuppressed, setSlashMenuSuppressed] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const isBusy = status === 'streaming' || status === 'submitted';

	// auto-grow textarea
	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
	}, [input]);

	const filteredSlashCommands = useMemo(() => {
		if (!input.startsWith('/')) {
			return [];
		}

		const query = input.slice(1).toLowerCase();
		return SLASH_COMMANDS.filter(({ command }) => command.slice(1).toLowerCase().startsWith(query));
	}, [input]);

	const showSlashMenu =
		input.startsWith('/') && !slashMenuSuppressed && !isBusy && filteredSlashCommands.length > 0;

	useEffect(() => {
		if (!input.startsWith('/')) {
			setSlashMenuSuppressed(false);
		}

		setSlashHighlightIndex(0);
	}, [input]);

	useEffect(() => {
		if (slashHighlightIndex >= filteredSlashCommands.length) {
			setSlashHighlightIndex(0);
		}
	}, [filteredSlashCommands.length, slashHighlightIndex]);

	const selectSlashCommand = (command: SlashCommand) => {
		setInput(command.prompt);
		setSlashMenuSuppressed(false);
	};

	const handleSubmit = async () => {
		try {
			setSubmitError(null);
			const sent = await onSubmit(input);

			if (sent) {
				setInput('');
			}
		} catch (error) {
			setSubmitError(error instanceof Error ? error.message : 'Failed to send message.');
		}
	};

	// ── Token estimate for context bar ──────────────────────────────────────────
	const totalContextChars = scriptCharCount + workspaceSummaryCharCount;
	const estimatedTokens = Math.round(totalContextChars / 4);

	// ── Status hint ─────────────────────────────────────────────────────────────
	const statusHint = modelConfigurationError
		? modelConfigurationError
		: !canSend
			? !hasProviderConfigured
				? 'Add API key in Settings → AI'
				: null
			: usingCredits && creditsRemaining !== 0 && !hasProviderConfigured
				? creditsRemaining === 'unlimited'
					? 'Unlimited Dastan prompts left today'
					: `${creditsRemaining} Dastan prompts left today`
				: null;

	const configuredModelIds = useMemo(
		() => new Set(availableModels.map((model) => model.id)),
		[availableModels],
	);

	const modelsByProvider = useMemo(() => {
		const groups = new Map<string, AiModelOption[]>();

		for (const model of allModels) {
			const label = AI_PROVIDER_LABELS[model.provider];
			const existing = groups.get(label) ?? [];
			existing.push(model);
			groups.set(label, existing);
		}

		return [...groups.entries()];
	}, [allModels]);

	// ── Theme classes ────────────────────────────────────────────────────────────
	const shellClass = isDark
		? 'border-t border-slate-700 bg-slate-900'
		: 'border-t border-stone-200 bg-[#f8f5ef]';

	const textareaClass = isDark
		? 'w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm text-slate-100 outline-none placeholder:text-slate-500'
		: 'w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm text-stone-900 outline-none placeholder:text-stone-400';

	const chipBase =
		'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] transition';

	const chipActive = isDark
		? 'border-amber-600 bg-amber-950/40 text-amber-200 hover:opacity-80'
		: 'border-amber-400 bg-amber-50 text-stone-900 hover:opacity-80';

	const chipInactive = isDark
		? 'border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-300'
		: 'border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700';

	const chipWarn = isDark
		? 'border-orange-600/70 bg-orange-950/30 text-orange-200 hover:opacity-80'
		: 'border-orange-400 bg-orange-50 text-orange-900 hover:opacity-80';

	const infoChipClass = isDark
		? 'border-slate-700 text-slate-500'
		: 'border-stone-200 text-stone-400';

	const toolbarBtnBase = isDark
		? 'inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-600 hover:text-slate-100'
		: 'inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-100 px-2 py-1 text-[11px] text-stone-600 transition hover:border-stone-300 hover:text-stone-800';

	const slashMenuClass = isDark
		? 'absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-xl'
		: 'absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl';

	const slashItemClass = (active: boolean) =>
		cn(
			'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition',
			active
				? isDark
					? 'bg-slate-800 text-slate-100'
					: 'bg-amber-50 text-stone-900'
				: isDark
					? 'text-slate-400 hover:bg-slate-800/60'
					: 'text-stone-600 hover:bg-stone-50',
		);

	const scriptChipActive = includeScriptContext && !selectionActive;
	const scriptOverLimit = scriptCharCount > 20_000;

	const placeholder =
		interactionMode === 'writer'
			? contextMode === 'script'
				? 'Ask for rewrites, dialogue, or scene edits…'
				: 'Ask for writing help across your library…'
			: contextMode === 'script'
				? 'Ask about your screenplay…'
				: 'Ask anything about your projects…';

	return (
		<div className={shellClass}>
			{statusHint ? (
				<p
					className={`px-3 pt-2 text-xs ${
						modelConfigurationError
							? 'text-red-500'
							: isDark
								? 'text-amber-300/80'
								: 'text-amber-800/80'
					}`}
				>
					{statusHint}
				</p>
			) : null}

			{/* ── Context chips ──────────────────────────────────────────────────── */}
			{(contextMode === 'script' || selectionActive || memoriesCount > 0 || globalRulesActive) ? (
				<div className="flex flex-wrap gap-1 px-3 pt-2">
					{contextMode === 'script' ? (
						<>
							<button
								className={cn(chipBase, scriptChipActive
									? scriptOverLimit && scriptCharCount > 0 ? chipWarn : chipActive
									: chipInactive)}
								title={`Include full script${scriptCharCount > 0 ? ` (${formatCharCount(scriptCharCount)} chars)` : ''}`}
								type="button"
								onClick={onToggleScript}
							>
								<FileText size={9} />
								@ Script
								{scriptChipActive && scriptCharCount > 0 ? (
									<span className="normal-case tracking-normal opacity-70">
										· {formatCharCount(scriptCharCount)}
									</span>
								) : null}
							</button>

							<button
								className={cn(chipBase, includeWorkspaceContext ? chipActive : chipInactive)}
								title="Include workspace context"
								type="button"
								onClick={onToggleWorkspace}
							>
								<LayoutGrid size={9} />
								@ Workspace
								{includeWorkspaceContext && workspaceSummaryCharCount > 0 ? (
									<span className="normal-case tracking-normal opacity-70">
										· {formatCharCount(workspaceSummaryCharCount)}
									</span>
								) : null}
							</button>
						</>
					) : null}

					{selectionActive ? (
						<span className={cn(chipBase, chipActive)}>
							<TextSelect size={9} />
							@ Selection
							<button
								aria-label="Clear selection context"
								className="ml-0.5 rounded-sm opacity-70 hover:opacity-100"
								type="button"
								onClick={onClearSelection}
							>
								<X size={9} />
							</button>
						</span>
					) : null}

					{memoriesCount > 0 ? (
						<span
							className={cn(chipBase, infoChipClass)}
							title="Pinned memories included in context"
						>
							<Brain size={9} />
							Memories ({memoriesCount})
						</span>
					) : null}

					{globalRulesActive ? (
						<span
							className={cn(chipBase, infoChipClass)}
							title="Writer rules included in context"
						>
							<ScrollText size={9} />
							Rules
						</span>
					) : null}
				</div>
			) : null}

			{/* ── Textarea ───────────────────────────────────────────────────────── */}
			<div className="relative px-1">
				{showSlashMenu ? (
					<div className={slashMenuClass} role="listbox" aria-label="Slash commands">
						{filteredSlashCommands.map((command, index) => (
							<button
								key={command.command}
								aria-selected={index === slashHighlightIndex}
								className={slashItemClass(index === slashHighlightIndex)}
								role="option"
								type="button"
								onMouseEnter={() => setSlashHighlightIndex(index)}
								onMouseDown={(event) => {
									event.preventDefault();
									selectSlashCommand(command);
								}}
							>
								<span
									className={`font-mono text-[11px] ${isDark ? 'text-amber-300' : 'text-amber-700'}`}
								>
									{command.command}
								</span>
								<span className="truncate opacity-60">{command.prompt}</span>
							</button>
						))}
					</div>
				) : null}

				<textarea
					ref={textareaRef}
					className={textareaClass}
					placeholder={placeholder}
					rows={3}
					style={{ maxHeight: 200, minHeight: 72 }}
					value={input}
					onChange={(event) => setInput(event.target.value)}
					onKeyDown={(event) => {
						if (showSlashMenu) {
							if (event.key === 'ArrowDown') {
								event.preventDefault();
								setSlashHighlightIndex((i) => (i + 1) % filteredSlashCommands.length);
								return;
							}

							if (event.key === 'ArrowUp') {
								event.preventDefault();
								setSlashHighlightIndex(
									(i) => (i - 1 + filteredSlashCommands.length) % filteredSlashCommands.length,
								);
								return;
							}

							if (event.key === 'Enter' && !event.shiftKey) {
								event.preventDefault();
								const selected = filteredSlashCommands[slashHighlightIndex];
								if (selected) {
									selectSlashCommand(selected);
								}

								return;
							}

							if (event.key === 'Escape') {
								event.preventDefault();
								setSlashMenuSuppressed(true);
								return;
							}
						}

						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							void handleSubmit();
						}
					}}
				/>
			</div>

			{/* ── Toolbar ─────────────────────────────────────────────────────────── */}
			<div
				className={`flex items-center gap-1.5 px-2 pb-2 pt-1 ${
					isDark ? '' : ''
				}`}
			>
				{/* Interaction mode (Ask / Writer) */}
				<div className="relative">
					<select
						aria-label="Interaction mode"
						className={cn(
							toolbarBtnBase,
							'cursor-pointer appearance-none pr-5',
							interactionMode === 'writer'
								? isDark
									? 'border-amber-700/60 bg-amber-950/30 text-amber-200'
									: 'border-amber-300 bg-amber-50/80 text-amber-900'
								: '',
						)}
						value={interactionMode}
						onChange={(e) => onInteractionModeChange(e.target.value as AiInteractionMode)}
					>
						<option value="ask">Ask</option>
						<option value="writer">Writer</option>
					</select>
					<ChevronDown
						className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 opacity-60"
						size={10}
					/>
				</div>

				{/* Model selector */}
				<div className="relative max-w-[9.5rem]">
					<select
						aria-label="AI model"
						className={cn(
							toolbarBtnBase,
							'max-w-full cursor-pointer appearance-none truncate pr-5',
							!isModelConfigured ? 'border-red-500/50 text-red-400' : '',
						)}
						title={modelConfigurationError ?? undefined}
						value={selectedModel}
						onChange={(e) => onModelChange(e.target.value)}
					>
						<option value={AUTO_MODEL_ID}>Auto</option>
						{modelsByProvider.map(([providerLabel, models]) => (
							<optgroup key={providerLabel} label={providerLabel}>
								{models.map((model) => (
									<option
										key={model.id}
										disabled={!configuredModelIds.has(model.id)}
										value={model.id}
									>
										{model.label}
										{configuredModelIds.has(model.id) ? '' : ' (needs API key)'}
									</option>
								))}
							</optgroup>
						))}
					</select>
					<ChevronDown
						className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 opacity-60"
						size={10}
					/>
				</div>

				{/* Context token estimate */}
				{estimatedTokens > 0 ? (
					<span
						className={`shrink-0 text-[10px] tabular-nums ${isDark ? 'text-slate-500' : 'text-stone-400'}`}
						title={`~${estimatedTokens.toLocaleString()} tokens in context`}
					>
						~{formatTokenCount(totalContextChars)} ctx
					</span>
				) : null}

				{/* Spacer */}
				<div className="flex-1" />

				{/* Stop / Send */}
				{isBusy ? (
					<button
						className={cn(
							'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-medium transition',
							isDark
								? 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-slate-100'
								: 'border-stone-300 bg-stone-100 text-stone-700 hover:border-stone-400 hover:text-stone-900',
						)}
						type="button"
						onClick={onStop}
					>
						<Square size={11} />
						Stop
					</button>
				) : (
					<button
						className={cn(
							'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition',
							input.trim() && canSend
								? isDark
									? 'bg-amber-600 text-white hover:bg-amber-500'
									: 'bg-amber-500 text-white hover:bg-amber-400'
								: isDark
									? 'cursor-not-allowed bg-slate-700 text-slate-500'
									: 'cursor-not-allowed bg-stone-200 text-stone-400',
						)}
						disabled={!input.trim() || !canSend}
						type="button"
						onClick={() => void handleSubmit()}
					>
						<Send size={11} />
						Send
					</button>
				)}
			</div>

			{submitError ? (
				<p className="px-3 pb-2 text-xs text-red-500">{submitError}</p>
			) : null}
		</div>
	);
}
