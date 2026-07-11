import { useEffect, useMemo, useRef, useState } from 'react';
import {
	ArrowUp,
	Brain,
	Check,
	ChevronDown,
	KeyRound,
	ScrollText,
	Square,
	TextSelect,
	X,
} from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getEditorTheme } from '../../utils/editor-theme';
import { AUTO_MODEL_ID, AI_PROVIDER_LABELS, resolveModelOption, type AiModelOption } from '../../utils/ai-models';
import type { AiChatContextMode } from '../../hooks/useAiChat';
import type { AiInteractionMode } from '../../utils/ai-interaction-mode';
import { AI_MODE_DEFINITIONS } from '../../utils/ai-mode-config';
import {
	filterSlashCommands,
	loadSlashCommands,
	resolveSlashPrompt,
	type SlashCommand,
} from '../../utils/ai-slash-commands';
import type { ScriptContextSections } from '../../utils/ai-script-context-options';
import type { JSONContent } from '@tiptap/core';
import type { ScreenplayWorkspaceData } from '../../types';
import type { AiMemory } from '../../utils/ai-memory-storage';
import type { CodexItem } from '../../utils/codex-storage';
import {
	buildContextManifest,
	formatTokenLabel,
	isNearContextBudget,
} from '../../utils/context-manifest';
import { AiContextInspector } from './AiContextInspector';
import type { AiSettingsSection } from '../../utils/ai-settings-sections';

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
	canUseEditorAi: boolean;
	usingCredits: boolean;
	creditsRemaining: number | 'unlimited';
	includeScriptContext: boolean;
	includeWorkspaceContext: boolean;
	scriptContextSections: ScriptContextSections;
	selectionActive: boolean;
	selectionText?: string | null;
	activeBlockIndex?: number | null;
	documentContent: JSONContent | null;
	workspace: ScreenplayWorkspaceData;
	globalRules: string;
	documentRules?: string;
	memories: AiMemory[];
	codexItems?: CodexItem[];
	memoriesCount: number;
	suggestedMemoriesCount: number;
	globalRulesActive: boolean;
	documentRulesActive: boolean;
	activeSceneLabel?: string;
	onInteractionModeChange: (mode: AiInteractionMode) => void;
	onClearSelection: () => void;
	onModelChange: (modelId: string) => void;
	onIncludeScriptChange: (value: boolean) => void;
	onIncludeWorkspaceChange: (value: boolean) => void;
	onScriptSectionChange: (patch: Partial<ScriptContextSections>) => void;
	onOpenSettings?: (section?: AiSettingsSection) => void;
	onOpenMemories?: () => void;
	onOpenRules?: () => void;
	onSubmit: (text: string) => Promise<boolean>;
	onStop: () => void;
	inputRef?: React.RefObject<HTMLTextAreaElement>;
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
	canUseEditorAi,
	usingCredits,
	creditsRemaining,
	includeScriptContext,
	includeWorkspaceContext,
	scriptContextSections,
	selectionActive,
	selectionText,
	activeBlockIndex = null,
	documentContent,
	workspace,
	globalRules,
	documentRules,
	memories,
	codexItems = [],
	memoriesCount,
	suggestedMemoriesCount,
	globalRulesActive,
	documentRulesActive,
	onInteractionModeChange,
	onClearSelection,
	onModelChange,
	onIncludeScriptChange,
	onIncludeWorkspaceChange,
	onScriptSectionChange,
	onOpenSettings,
	onOpenMemories,
	onOpenRules,
	onSubmit,
	onStop,
	inputRef: externalInputRef,
}: AiChatInputProps) {
	const [input, setInput] = useState('');
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [slashHighlightIndex, setSlashHighlightIndex] = useState(0);
	const [slashMenuSuppressed, setSlashMenuSuppressed] = useState(false);
	const [contextInspectorOpen, setContextInspectorOpen] = useState(false);
	const [slashCommands, setSlashCommands] = useState<SlashCommand[]>(() => loadSlashCommands());
	const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
	const textareaRef = externalInputRef ?? internalTextareaRef;
	const isBusy = status === 'streaming' || status === 'submitted';

	useEffect(() => {
		const refresh = () => setSlashCommands(loadSlashCommands());
		window.addEventListener('storage', refresh);
		window.addEventListener('dastan:slash-commands-updated', refresh);
		return () => {
			window.removeEventListener('storage', refresh);
			window.removeEventListener('dastan:slash-commands-updated', refresh);
		};
	}, []);

	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
	}, [input, textareaRef]);

	const filteredSlashCommands = useMemo(() => {
		if (!input.startsWith('/')) {
			return [];
		}

		return filterSlashCommands(slashCommands, input);
	}, [input, slashCommands]);

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
		const resolved = resolveSlashPrompt(command.promptTemplate, {
			selection: selectionText ?? undefined,
			scene: undefined,
		});
		setInput(resolved);
		setSlashMenuSuppressed(false);
	};

	const handleSubmit = async () => {
		const text = input;
		const trimmed = text.trim();

		if (!trimmed || isBusy) {
			return;
		}

		setInput('');

		try {
			setSubmitError(null);
			const sent = await onSubmit(text);

			if (!sent) {
				setInput(text);
			}
		} catch (error) {
			setInput(text);
			setSubmitError(error instanceof Error ? error.message : 'Failed to send message.');
		}
	};

	const contextManifest = useMemo(
		() =>
			buildContextManifest({
				documentContent: contextMode === 'script' ? documentContent : null,
				workspace,
				globalRules,
				documentRules,
				memories,
				codexItems,
				includeScriptContext: contextMode === 'script' && includeScriptContext,
				includeWorkspaceContext: contextMode === 'script' && includeWorkspaceContext,
				scriptContextSections,
				selectionText,
				activeBlockIndex,
			}),
		[
			activeBlockIndex,
			codexItems,
			contextMode,
			documentContent,
			documentRules,
			globalRules,
			includeScriptContext,
			includeWorkspaceContext,
			memories,
			scriptContextSections,
			selectionText,
			workspace,
		],
	);

	const nearBudget = isNearContextBudget(contextManifest);
	const activeMode = AI_MODE_DEFINITIONS.find((m) => m.id === interactionMode) ?? AI_MODE_DEFINITIONS[0]!;
	const ActiveModeIcon = activeMode.icon;
	const selectedModelLabel = resolveModelOption(selectedModel)?.label ?? 'Auto';

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

	const theme = getEditorTheme(isDark);
	const shellClass = theme.aiInputShell;
	const textareaClass =
		'w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm text-foreground outline-none placeholder:text-muted-foreground';
	const chipBase =
		'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] transition';
	const chipActive = theme.accentPill;
	const infoChipClass = `border-border ${theme.statusText} cursor-pointer hover:opacity-90`;
	const toolbarBtnBase = `inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${theme.statusPill}`;
	const slashMenuClass = `absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-xl border shadow-xl ${theme.surface} ${theme.border}`;
	const slashItemClass = (active: boolean) =>
		cn(
			'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition',
			active ? theme.modeActive : `${theme.statusText} hover:bg-accent/60`,
		);

	const showCreditsHint = usingCredits && creditsRemaining !== 0 && !hasProviderConfigured;

	const placeholder =
		interactionMode === 'editor'
			? 'Tell the editor AI what to change in your script or workspace…'
			: interactionMode === 'planner'
				? contextMode === 'script'
					? 'Ask for structured proposals for scenes, beats, or characters…'
					: 'Ask for planning help across your library…'
				: contextMode === 'script'
					? 'Ask about your screenplay…'
					: 'Ask anything about your projects…';

	const hasStatusChips =
		selectionActive || memoriesCount > 0 || globalRulesActive || documentRulesActive || suggestedMemoriesCount > 0;

	return (
		<div className={shellClass}>
			{modelConfigurationError ? (
				<p className="px-3 pt-2 text-xs text-red-500">{modelConfigurationError}</p>
			) : !canSend && !hasProviderConfigured ? (
				<div className="px-3 pt-2">
					<button
						className={`text-xs underline-offset-2 hover:underline ${isDark ? 'text-gold/90' : 'text-gold-700'}`}
						type="button"
						onClick={() => onOpenSettings?.('providers')}
					>
						Add API key in Settings → AI
					</button>
				</div>
			) : showCreditsHint ? (
				<p className={`px-3 pt-2 text-xs tabular-nums ${theme.statusText}`}>
					{creditsRemaining === 'unlimited'
						? 'Unlimited Dastan prompts left today'
						: `${creditsRemaining} Dastan prompts left today`}
				</p>
			) : null}

			{hasStatusChips ? (
				<div className="flex flex-wrap gap-1 px-3 pt-2">
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

					{(memoriesCount > 0 || suggestedMemoriesCount > 0) && onOpenMemories ? (
						<button
							className={cn(chipBase, infoChipClass, 'relative')}
							title="Open memories"
							type="button"
							onClick={onOpenMemories}
						>
							<Brain size={9} />
							Memories {memoriesCount > 0 ? `(${memoriesCount})` : ''}
							{suggestedMemoriesCount > 0 ? (
								<span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-gold" aria-hidden />
							) : null}
						</button>
					) : null}

					{(globalRulesActive || documentRulesActive) && onOpenRules ? (
						<button
							className={cn(chipBase, infoChipClass)}
							title="Edit writer rules"
							type="button"
							onClick={onOpenRules}
						>
							<ScrollText size={9} />
							Rules
						</button>
					) : null}
				</div>
			) : null}

			<div className="relative px-1">
				{showSlashMenu ? (
					<div className={slashMenuClass} role="listbox" aria-label="Slash commands">
						{filteredSlashCommands.map((command, index) => (
							<button
								key={command.id}
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
								<span className={`font-mono text-[11px] ${isDark ? 'text-gold/90' : 'text-gold-700'}`}>
									{command.command}
								</span>
								<span className="truncate opacity-60">{command.promptTemplate}</span>
							</button>
						))}
						{onOpenSettings ? (
							<button
								className={`w-full border-t px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em] ${theme.statusText} hover:bg-accent/60`}
								type="button"
								onClick={() => onOpenSettings('behavior')}
							>
								Edit commands…
							</button>
						) : null}
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
						if (isBusy && event.key === 'Escape') {
							event.preventDefault();
							onStop();
							return;
						}

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

			<div className="relative flex items-center gap-1 px-2 pb-2 pt-1">
				<DropdownMenu>
					<DropdownMenuTrigger
						aria-label="Interaction mode"
						className={cn(toolbarBtnBase, interactionMode && theme.modeActive)}
						type="button"
					>
						<ActiveModeIcon size={12} />
						<span className="max-w-[4.5rem] truncate">{activeMode.label}</span>
						<ChevronDown className="opacity-60" size={10} />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="z-[100] w-56">
						{AI_MODE_DEFINITIONS.map((mode) => {
							const Icon = mode.icon;
							const disabled = mode.id === 'editor' && !canUseEditorAi;

							return (
								<DropdownMenuItem
									key={mode.id}
									className={cn('flex flex-col items-start gap-0.5 py-2', disabled && 'opacity-50')}
									disabled={disabled}
									onClick={() => {
										if (!disabled) {
											onInteractionModeChange(mode.id);
										}
									}}
								>
									<span className="flex items-center gap-2 text-xs font-medium">
										<Icon size={12} />
										{mode.label}
										{interactionMode === mode.id ? <Check className="ml-auto size-3" /> : null}
									</span>
									<span className="pl-5 text-[10px] leading-snug text-muted-foreground">
										{disabled
											? 'Add an API key or sign in to use editor tools'
											: mode.description}
									</span>
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger
						aria-label="AI model"
						className={cn(
							toolbarBtnBase,
							'max-sm:px-1.5',
							!isModelConfigured && 'border-red-500/50 text-red-400',
						)}
						title={modelConfigurationError ?? undefined}
						type="button"
					>
						<span className="max-sm:sr-only truncate">{selectedModelLabel}</span>
						<span className="sm:hidden text-[10px]">Mdl</span>
						<ChevronDown className="opacity-60" size={10} />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="z-[100] max-h-64 w-52 overflow-y-auto">
						<DropdownMenuItem
							className="text-xs"
							onClick={() => onModelChange(AUTO_MODEL_ID)}
						>
							Auto
							{selectedModel === AUTO_MODEL_ID ? <Check className="ml-auto size-3" /> : null}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						{modelsByProvider.map(([providerLabel, models]) => (
							<DropdownMenuGroup key={providerLabel}>
								<DropdownMenuLabel className="text-[10px] uppercase tracking-[0.12em]">
									{providerLabel}
								</DropdownMenuLabel>
								{models.map((model) => {
									const configured = configuredModelIds.has(model.id);

									return (
										<DropdownMenuItem
											key={model.id}
											className="text-xs"
											disabled={!configured}
											onClick={() => {
												if (configured) {
													onModelChange(model.id);
													return;
												}

												onOpenSettings?.('providers');
											}}
										>
											{!configured ? <KeyRound className="size-3 opacity-60" /> : null}
											<span className="truncate">{model.label}</span>
											{!configured ? (
												<span className="ml-auto text-[10px] text-muted-foreground">Key</span>
											) : selectedModel === model.id ? (
												<Check className="ml-auto size-3" />
											) : null}
										</DropdownMenuItem>
									);
								})}
							</DropdownMenuGroup>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				<div className="flex-1" />

				<div className="relative flex items-center gap-1">
					<button
						aria-expanded={contextInspectorOpen}
						className={cn(
							'rounded-full border px-2 py-0.5 text-[10px] tabular-nums transition',
							nearBudget ? theme.modeActive : theme.statusPill,
						)}
						type="button"
						onClick={() => setContextInspectorOpen((open) => !open)}
					>
						{formatTokenLabel(contextManifest.totalTokenEstimate)} ctx
					</button>

					<AiContextInspector
						activeBlockIndex={activeBlockIndex}
						codexItems={codexItems}
						documentContent={documentContent}
						documentRules={documentRules}
						globalRules={globalRules}
						includeScriptContext={includeScriptContext}
						includeWorkspaceContext={includeWorkspaceContext}
						isDark={isDark}
						memories={memories}
						open={contextInspectorOpen}
						scriptContextSections={scriptContextSections}
						selectionText={selectionText}
						workspace={workspace}
						onClose={() => setContextInspectorOpen(false)}
						onIncludeScriptChange={onIncludeScriptChange}
						onIncludeWorkspaceChange={onIncludeWorkspaceChange}
						onScriptSectionChange={onScriptSectionChange}
					/>

					{isBusy ? (
						<button
							aria-label="Stop"
							className={cn(
								'inline-flex size-8 items-center justify-center rounded-md border transition',
								theme.statusPill,
							)}
							type="button"
							onClick={onStop}
						>
							<Square size={14} />
						</button>
					) : (
						<button
							aria-label="Send"
							className={cn(
								'inline-flex size-8 items-center justify-center rounded-md transition',
								input.trim() && canSend
									? 'bg-gold text-ink hover:bg-gold/90'
									: 'cursor-not-allowed bg-muted text-muted-foreground',
							)}
							disabled={!input.trim() || !canSend}
							type="button"
							onClick={() => void handleSubmit()}
						>
							<ArrowUp size={16} />
						</button>
					)}
				</div>
			</div>

			{submitError ? <p className="px-3 pb-2 text-xs text-red-500">{submitError}</p> : null}
		</div>
	);
}
