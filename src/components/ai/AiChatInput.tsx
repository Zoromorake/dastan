import { useState } from 'react';
import { Send, Square } from 'lucide-react';
import { getAvailableModels } from '../../utils/ai-models';
import type { AiSettings } from '../../utils/ai-settings';

interface AiChatInputProps {
	isDark: boolean;
	settings: AiSettings;
	selectedModel: string;
	includeScriptContext: boolean;
	includeWorkspaceContext: boolean;
	status: 'submitted' | 'streaming' | 'ready' | 'error';
	onModelChange: (modelId: string) => void;
	onIncludeScriptContextChange: (value: boolean) => void;
	onIncludeWorkspaceContextChange: (value: boolean) => void;
	onSubmit: (text: string) => Promise<void>;
	onStop: () => void;
}

export function AiChatInput({
	isDark,
	settings,
	selectedModel,
	includeScriptContext,
	includeWorkspaceContext,
	status,
	onModelChange,
	onIncludeScriptContextChange,
	onIncludeWorkspaceContextChange,
	onSubmit,
	onStop,
}: AiChatInputProps) {
	const [input, setInput] = useState('');
	const [submitError, setSubmitError] = useState<string | null>(null);
	const models = getAvailableModels(settings.apiKeys);
	const isBusy = status === 'streaming' || status === 'submitted';

	const textareaClass = isDark
		? 'min-h-24 w-full resize-none rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-600/70'
		: 'min-h-24 w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-amber-400';
	const chipClass = (active: boolean) =>
		active
			? isDark
				? 'border-amber-600 bg-amber-950/40 text-amber-200'
				: 'border-amber-400 bg-amber-50 text-stone-900'
			: isDark
				? 'border-slate-600 text-slate-400'
				: 'border-stone-300 text-stone-600';
	const selectClass = isDark
		? 'rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-200'
		: 'rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700';

	return (
		<div className={`border-t px-4 py-3 ${isDark ? 'border-slate-700 bg-slate-800/80' : 'border-stone-300 bg-[#f3eee4]'}`}>
			<div className="mb-2 flex flex-wrap gap-2">
				<button
					className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${chipClass(includeScriptContext)}`}
					type="button"
					onClick={() => onIncludeScriptContextChange(!includeScriptContext)}
				>
					@ Script
				</button>
				<button
					className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${chipClass(includeWorkspaceContext)}`}
					type="button"
					onClick={() => onIncludeWorkspaceContextChange(!includeWorkspaceContext)}
				>
					@ Workspace
				</button>
			</div>

			<textarea
				className={textareaClass}
				placeholder="Ask about your screenplay…"
				value={input}
				onChange={(event) => setInput(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault();
						void (async () => {
							try {
								setSubmitError(null);
								await onSubmit(input);
								setInput('');
							} catch (error) {
								setSubmitError(error instanceof Error ? error.message : 'Failed to send message.');
							}
						})();
					}
				}}
			/>

			<div className="mt-2 flex items-center justify-between gap-2">
				<select
					className={selectClass}
					value={selectedModel}
					onChange={(event) => onModelChange(event.target.value)}
					disabled={models.length === 0}
				>
					{models.length === 0 ? <option value="">Add API key in Settings</option> : null}
					{models.map((model) => (
						<option key={model.id} value={model.id}>
							{model.label}
						</option>
					))}
				</select>

				{isBusy ? (
					<button
						className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${isDark ? 'border-slate-600 text-slate-300' : 'border-stone-300 text-stone-700'}`}
						type="button"
						onClick={onStop}
					>
						<Square size={12} />
						Stop
					</button>
				) : (
					<button
						className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${isDark ? 'border-amber-700 text-amber-200' : 'border-amber-400 text-stone-900'}`}
						type="button"
						disabled={!input.trim() || models.length === 0}
						onClick={() => {
							void (async () => {
								try {
									setSubmitError(null);
									await onSubmit(input);
									setInput('');
								} catch (error) {
									setSubmitError(error instanceof Error ? error.message : 'Failed to send message.');
								}
							})();
						}}
					>
						<Send size={12} />
						Send
					</button>
				)}
			</div>

			{submitError ? <p className="mt-2 text-xs text-red-500">{submitError}</p> : null}
		</div>
	);
}
