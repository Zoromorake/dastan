import { useRef, useState } from 'react';
import { ChevronDown, FilePlus, FileText, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getHubTheme, getSettingsTheme } from '../../utils/hub-theme';
import { SCRIPT_TEMPLATE_DESCRIPTIONS } from '../../utils/script-templates';
import {
	loadDefaultTemplate,
	SCRIPT_TEMPLATE_LABELS,
	type ScriptTemplate,
} from '../../utils/user-settings';

interface NewScriptMenuProps {
	isDark: boolean;
	size?: 'sm' | 'default';
	appearance?: 'primary' | 'outline';
	onStartScratch: () => void;
	onStartGuide?: () => void;
	onCreateTemplate: (template: ScriptTemplate) => void;
	onImport: (file: File) => void;
}

const templateOrder: ScriptTemplate[] = [
	'feature',
	'short',
	'tv_pilot',
	'tv_episode',
	'stage_play',
	'documentary',
];

export function NewScriptMenu({
	isDark,
	size = 'default',
	appearance = 'primary',
	onStartScratch,
	onStartGuide = () => {},
	onCreateTemplate,
	onImport,
}: NewScriptMenuProps) {
	const hub = getHubTheme(isDark);
	const ui = getSettingsTheme(isDark);
	const uploadInputRef = useRef<HTMLInputElement | null>(null);
	const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
	const preferredTemplate = loadDefaultTemplate();

	const isSmall = size === 'sm';
	const isPrimary = appearance === 'primary' && !isSmall;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					className={cn(
						'inline-flex shrink-0 items-center gap-1.5 rounded-md border font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50',
						isSmall ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-sm',
						isPrimary
							? hub.accentButton
							: 'border-border bg-background text-foreground hover:bg-accent',
					)}
					type="button"
				>
					<FilePlus size={isSmall ? 14 : 16} />
					New script
					<ChevronDown size={14} className="opacity-70" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="z-[100] w-56">
					<DropdownMenuItem
						onClick={() => {
							onStartScratch();
						}}
					>
						<FileText size={14} />
						Start from scratch
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => {
							onStartGuide();
						}}
					>
						<FilePlus size={14} />
						Start with a guide
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => {
							window.setTimeout(() => setTemplateDialogOpen(true), 0);
						}}
					>
						<FilePlus size={14} />
						Use a template…
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={() => {
							window.setTimeout(() => uploadInputRef.current?.click(), 0);
						}}
					>
						<Upload size={14} />
						Import file…
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
				<DialogContent className={cn('max-w-md gap-0 p-0', ui.shell)}>
					<DialogHeader className={cn('border-b px-5 py-4', isDark ? 'border-slate-700' : 'border-stone-200')}>
						<DialogTitle className={ui.title}>Choose a template</DialogTitle>
						<DialogDescription className={ui.muted}>
							Each template opens with sample scenes and industry-standard formatting. Replace the placeholder text with your story.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2 p-4">
						{templateOrder.map((template) => {
							const isPreferred = template === preferredTemplate;

							return (
								<button
									key={template}
									className={cn(
										'w-full rounded-xl border px-4 py-3 text-left transition hover:bg-accent',
										isPreferred
											? isDark
												? 'border-amber-600/50 bg-amber-950/30'
												: 'border-amber-400/60 bg-amber-50'
											: isDark
												? 'border-slate-700 bg-slate-800/40'
												: 'border-stone-200 bg-stone-50/80',
									)}
									type="button"
									onClick={() => {
										setTemplateDialogOpen(false);
										onCreateTemplate(template);
									}}
								>
									<div className="flex items-center justify-between gap-2">
										<p className={cn('text-sm font-medium', ui.title)}>{SCRIPT_TEMPLATE_LABELS[template]}</p>
										{isPreferred ? (
											<span className="text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-300">
												Your default
											</span>
										) : null}
									</div>
									<p className={cn('mt-1 text-xs', ui.muted)}>{SCRIPT_TEMPLATE_DESCRIPTIONS[template]}</p>
								</button>
							);
						})}
					</div>
				</DialogContent>
			</Dialog>

			<input
				ref={uploadInputRef}
				accept=".fountain,.txt,.fdx,.pdf,text/plain,text/xml,application/xml,application/pdf"
				className="hidden"
				type="file"
				onChange={(event) => {
					const file = event.target.files?.[0];

					if (file) {
						onImport(file);
					}

					event.target.value = '';
				}}
			/>
		</>
	);
}
