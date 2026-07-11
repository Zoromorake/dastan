import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getEditorTheme } from '../../utils/editor-theme';
import { loadAiSettings, saveAiSettings } from '../../utils/ai-settings';
import type { ScreenplayWorkspaceData } from '../../types';

interface AiRulesDrawerProps {
	open: boolean;
	isDark: boolean;
	documentRules: string;
	onDocumentRulesChange: (rules: string) => void;
	onClose: () => void;
}

export function AiRulesDrawer({
	open,
	isDark,
	documentRules,
	onDocumentRulesChange,
	onClose,
}: AiRulesDrawerProps) {
	const theme = getEditorTheme(isDark);
	const [globalRules, setGlobalRules] = useState(() => loadAiSettings().globalRules);

	useEffect(() => {
		if (open) {
			setGlobalRules(loadAiSettings().globalRules);
		}
	}, [open]);

	if (!open) {
		return null;
	}

	const inputClass = `min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`;

	return (
		<div className={`absolute inset-0 z-30 flex flex-col backdrop-blur-sm ${isDark ? 'bg-ink-soft/98' : 'bg-[#f6f2ea]/98'}`}>
			<div className={`flex items-center justify-between border-b px-4 py-3 ${theme.border}`}>
				<div>
					<h3 className={`text-sm font-semibold ${theme.panelTitle}`}>Writer rules</h3>
					<p className={`text-xs ${theme.statusText}`}>Applied to AI context for this script and globally.</p>
				</div>
				<button
					aria-label="Close rules"
					className={`rounded-md border p-1.5 ${theme.statusPill}`}
					type="button"
					onClick={onClose}
				>
					<X size={14} />
				</button>
			</div>

			<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
				<label className="grid gap-2">
					<span className={`text-[10px] uppercase tracking-[0.14em] ${theme.statusText}`}>Global rules</span>
					<textarea
						className={inputClass}
						placeholder="Always write in present tense. Grounded thrillers — avoid sci-fi conventions."
						value={globalRules}
						onChange={(event) => {
							const next = event.target.value;
							setGlobalRules(next);
							const settings = loadAiSettings();
							saveAiSettings({ ...settings, globalRules: next });
						}}
					/>
				</label>

				<label className="grid gap-2">
					<span className={`text-[10px] uppercase tracking-[0.14em] ${theme.statusText}`}>This script</span>
					<textarea
						className={inputClass}
						placeholder="This draft is a contained two-hander. Keep locations minimal."
						value={documentRules}
						onChange={(event) => onDocumentRulesChange(event.target.value)}
					/>
				</label>
			</div>
		</div>
	);
}

export function getDocumentWriterRules(workspace: ScreenplayWorkspaceData): string {
	return workspace.aiWriterRules?.trim() ?? '';
}
