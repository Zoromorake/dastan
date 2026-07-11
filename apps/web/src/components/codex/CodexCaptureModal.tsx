import { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createCodexItem, type CodexScope } from '../../utils/codex-storage';
import { notifyCodexChanged } from '../../utils/codex-events';
import {
	CodexEditorForm,
	emptyCodexForm,
	parseTagList,
	type CodexFormState,
} from './CodexEditorForm';

interface CodexCaptureModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultScope?: CodexScope;
	documentId?: string;
	projectId?: string;
	projectOptions?: Array<{ id: string; title: string }>;
	/** Prefer style when capturing mid-write */
	defaultType?: 'style' | 'reference';
}

export function CodexCaptureModal({
	open,
	onOpenChange,
	defaultScope = 'global',
	documentId,
	projectId,
	projectOptions = [],
	defaultType = 'style',
}: CodexCaptureModalProps) {
	const [form, setForm] = useState<CodexFormState>(() =>
		emptyCodexForm({
			type: defaultType,
			scope: defaultScope,
			documentId,
			projectId,
		}),
	);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open) {
			setForm(
				emptyCodexForm({
					type: defaultType,
					scope: defaultScope,
					documentId,
					projectId,
				}),
			);
		}
	}, [open, defaultType, defaultScope, documentId, projectId]);

	const scopeOptions: CodexScope[] = documentId
		? projectId
			? ['document', 'project', 'global']
			: ['document', 'global']
		: projectId
			? ['project', 'global']
			: ['global'];

	const canSave =
		form.type === 'style' ? form.instinct.trim().length > 0 : form.content.trim().length > 0 || form.title.trim().length > 0;

	const handleSave = async () => {
		if (!canSave || saving) {
			return;
		}

		setSaving(true);
		try {
			const tags = parseTagList(form.tags);
			const scope = form.scope;
			const resolvedDocumentId = scope === 'document' ? documentId ?? form.documentId : undefined;
			const resolvedProjectId = scope === 'project' ? projectId ?? form.projectId : undefined;

			if (form.type === 'style') {
				await createCodexItem({
					type: 'style',
					title: form.title.trim() || undefined,
					content: form.content,
					scope,
					documentId: resolvedDocumentId,
					projectId: resolvedProjectId,
					tags,
					pinned: form.pinned,
					domain: form.domain,
					appliesWhen: form.appliesWhen,
					instinct: form.instinct,
					rationale: form.rationale || undefined,
					exemplars: parseTagList(form.exemplars),
				});
			} else {
				await createCodexItem({
					type: 'reference',
					title: form.title.trim() || 'Untitled note',
					content: form.content,
					scope,
					documentId: resolvedDocumentId,
					projectId: resolvedProjectId,
					tags,
					pinned: form.pinned,
					source: form.source || undefined,
					chunks: [],
				});
			}

			notifyCodexChanged();
			onOpenChange(false);
		} finally {
			setSaving(false);
		}
	};

	const inputClass =
		'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
	const chipClass = 'rounded-md border border-border px-2.5 py-1 text-xs capitalize text-muted-foreground hover:bg-accent';
	const chipActiveClass =
		'rounded-md border border-gold/50 bg-gold/15 px-2.5 py-1 text-xs capitalize text-foreground';
	const labelClass = 'text-[10px] uppercase tracking-[0.12em] text-muted-foreground';

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Capture to Codex</DialogTitle>
					<DialogDescription>
						Jot a style instinct or craft note. Pinned entries always feed the AI.
					</DialogDescription>
				</DialogHeader>

				<CodexEditorForm
					value={form}
					onChange={setForm}
					inputClass={inputClass}
					labelClass={labelClass}
					chipClass={chipClass}
					chipActiveClass={chipActiveClass}
					scopeOptions={scopeOptions}
					projectOptions={projectOptions}
					documentLabel="This script"
				/>

				<DialogFooter>
					<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button type="button" disabled={!canSave || saving} onClick={() => void handleSave()}>
						{saving ? 'Saving…' : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** ⌘/Ctrl+Shift+N opens Codex capture. */
export function useCodexCaptureHotkey(onOpen: () => void): void {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) {
				return;
			}
			if (event.key.toLowerCase() !== 'n') {
				return;
			}
			const target = event.target as HTMLElement | null;
			if (target?.closest('input, textarea, [contenteditable="true"]') && !event.metaKey && !event.ctrlKey) {
				return;
			}
			event.preventDefault();
			onOpen();
		};

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [onOpen]);
}
