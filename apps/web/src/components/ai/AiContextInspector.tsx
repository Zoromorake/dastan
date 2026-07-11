import { cn } from '@/lib/utils';
import { getEditorTheme } from '../../utils/editor-theme';
import {
	buildContextManifest,
	formatTokenLabel,
	isNearContextBudget,
	manifestFromStored,
	type ContextManifest,
	type StoredContextManifest,
} from '../../utils/context-manifest';
import type { ScriptContextSections } from '../../utils/ai-script-context-options';
import type { JSONContent } from '@tiptap/core';
import type { ScreenplayWorkspaceData } from '../../types';
import type { AiMemory } from '../../utils/ai-memory-storage';
import type { CodexItem } from '../../utils/codex-storage';

interface AiContextInspectorProps {
	open: boolean;
	isDark: boolean;
	readOnly?: boolean;
	snapshot?: StoredContextManifest | null;
	documentContent: JSONContent | null;
	workspace: ScreenplayWorkspaceData;
	globalRules: string;
	documentRules?: string;
	memories: AiMemory[];
	codexItems?: CodexItem[];
	includeScriptContext: boolean;
	includeWorkspaceContext: boolean;
	scriptContextSections: ScriptContextSections;
	selectionText?: string | null;
	activeBlockIndex?: number | null;
	onIncludeScriptChange?: (value: boolean) => void;
	onIncludeWorkspaceChange?: (value: boolean) => void;
	onScriptSectionChange?: (patch: Partial<ScriptContextSections>) => void;
	onClose: () => void;
}

function ContextBar({
	manifest,
	isDark,
}: {
	manifest: ContextManifest;
	isDark: boolean;
}) {
	const pct = Math.min(100, Math.round((manifest.totalTokenEstimate / manifest.budgetTokens) * 100));
	const near = isNearContextBudget(manifest);

	return (
		<div className="mb-3 space-y-1">
			<div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
				<span>Estimated context</span>
				<span className={cn('tabular-nums', near && 'text-gold')}>
					{formatTokenLabel(manifest.totalTokenEstimate)} / {formatTokenLabel(manifest.budgetTokens)}
				</span>
			</div>
			<div
				className={cn(
					'h-1.5 overflow-hidden rounded-full',
					isDark ? 'bg-muted' : 'bg-muted/80',
				)}
			>
				<div
					className={cn('h-full rounded-full transition-all', near ? 'bg-gold' : 'bg-primary/60')}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

export function AiContextInspector({
	open,
	isDark,
	readOnly = false,
	snapshot = null,
	documentContent,
	workspace,
	globalRules,
	documentRules,
	memories,
	codexItems = [],
	includeScriptContext,
	includeWorkspaceContext,
	scriptContextSections,
	selectionText,
	activeBlockIndex,
	onIncludeScriptChange,
	onIncludeWorkspaceChange,
	onScriptSectionChange,
	onClose,
}: AiContextInspectorProps) {
	if (!open) {
		return null;
	}

	const theme = getEditorTheme(isDark);
	const manifest = snapshot
		? manifestFromStored(snapshot)
		: buildContextManifest({
				documentContent,
				workspace,
				globalRules,
				documentRules,
				memories,
				codexItems,
				includeScriptContext,
				includeWorkspaceContext,
				scriptContextSections,
				selectionText,
				activeBlockIndex,
			});

	const panelClass = cn(
		'absolute bottom-full right-2 z-30 mb-1 w-[min(18rem,calc(100%-1rem))] rounded-xl border p-3 shadow-xl',
		theme.surface,
		theme.border,
	);

	const handleToggle = (sectionId: string, enabled: boolean) => {
		if (readOnly) {
			return;
		}

		if (sectionId === 'workspace_summary') {
			onIncludeWorkspaceChange?.(enabled);
			return;
		}

		if (sectionId === 'full_script') {
			onIncludeScriptChange?.(enabled);
			return;
		}

		const patch: Partial<ScriptContextSections> = {};

		if (sectionId === 'neighboring_scenes') patch.neighboringScenes = enabled;
		if (sectionId === 'scene_outline') patch.sceneOutline = enabled;
		if (sectionId === 'rolling_summary') patch.rollingSummary = enabled;
		if (sectionId === 'other_scene_excerpts') patch.otherSceneExcerpts = enabled;
		if (sectionId === 'script_opening') patch.scriptOpening = enabled;
		if (sectionId === 'script_ending') patch.scriptEnding = enabled;

		if (Object.keys(patch).length > 0) {
			onScriptSectionChange?.(patch);
		}
	};

	return (
		<>
			<button
				aria-label="Close context inspector"
				className="fixed inset-0 z-20"
				type="button"
				onClick={onClose}
			/>
			<div className={panelClass} role="dialog" aria-label={readOnly ? 'Context snapshot' : 'Context inspector'}>
				<div className="mb-2 flex items-center justify-between gap-2">
					<p className={`text-xs font-medium ${theme.panelTitle}`}>
						{readOnly ? 'Context sent' : 'What the AI can see'}
					</p>
					{readOnly && snapshot ? (
						<span className={`text-[10px] ${theme.statusText}`}>
							{new Date(snapshot.capturedAt).toLocaleTimeString()}
						</span>
					) : null}
				</div>

				<ContextBar manifest={manifest} isDark={isDark} />

				<ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
					{manifest.sections.map((section) => {
						const canToggle =
							!readOnly &&
							section.toggleable &&
							(section.id !== 'full_script' || true);

						return (
							<li
								key={section.id}
								className={cn(
									'flex items-start justify-between gap-2 rounded-md px-2 py-1.5',
									!section.enabled && 'opacity-50',
								)}
							>
								<div className="min-w-0 flex-1">
									{canToggle ? (
										<label className="flex cursor-pointer items-center gap-2">
											<input
												checked={section.enabled}
												className="size-3 accent-gold"
												type="checkbox"
												onChange={(e) => handleToggle(section.id, e.target.checked)}
											/>
											<span className="truncate">{section.label}</span>
										</label>
									) : (
										<span className="truncate">{section.label}</span>
									)}
									{section.detail?.length ? (
										<ul className={`mt-0.5 truncate pl-5 text-[10px] ${theme.statusText}`}>
											{section.detail.slice(0, 3).map((line) => (
												<li key={line} className="truncate">
													{line}
												</li>
											))}
										</ul>
									) : null}
								</div>
								<span className={`shrink-0 tabular-nums ${theme.statusText}`}>
									{formatTokenLabel(section.tokenEstimate)}
								</span>
							</li>
						);
					})}
				</ul>
			</div>
		</>
	);
}
