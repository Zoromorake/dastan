import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Menu } from 'lucide-react';
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
import type { ScreenplaySaveStatus } from '../types';
import { loadPenName, loadProfileImage } from '../utils/hub-utils';
import { getEditorTheme } from '../utils/editor-theme';
import { EditorWorkspaceNav } from './EditorWorkspaceNav';
import type { WorkspaceMode } from '../types/workspace-navigation';
import { ShareDialog } from './ShareDialog';
import { ShortcutsModal } from './ShortcutsModal';
import { UserSettingsPanel } from './UserSettingsPanel';
import type { SettingsTab, UserThemeSetting } from './UserSettingsPanel';
import type { CollaboratorPresence } from '@dastan/plugin-api';
import { CollaboratorAvatars } from './CollaboratorAvatars';
import { LocalAccountBadge } from './settings/LocalAccountBadge';
interface TopBarProps {
	theme: UserThemeSetting;
	resolvedTheme: 'light' | 'dark';
	onThemeChange: (theme: UserThemeSetting) => void;
	title: string;
	onTitleChange: (value: string) => void;
	saveStatus: ScreenplaySaveStatus;
	focusMode: boolean;
	documentId: string;
	onBackToHub?: () => void;
	onNewDocument?: () => void;
	onImport: (file: File) => void;
	onExport: (format: 'fountain' | 'text' | 'fdx' | 'pdf') => void;
	onToggleFocusMode: () => void;
	onOpenVersionHistory: () => void;
	workspaceMode: WorkspaceMode;
	onWorkspaceModeChange: (mode: WorkspaceMode) => void;
	settingsTabRequest?: SettingsTab | null;
	onSettingsTabRequestHandled?: () => void;
	onOpenFindReplace?: () => void;
	typewriterMode?: boolean;
	onToggleTypewriterMode?: () => void;
	scriptStatsLabel?: string;
	collaborators?: CollaboratorPresence[];
	collaborationActive?: boolean;
}

export function TopBar({
	theme,
	resolvedTheme,
	onThemeChange,
	title,
	onTitleChange,
	saveStatus,
	focusMode,
	documentId,
	onBackToHub,
	onNewDocument,
	onImport,
	onExport,
	onToggleFocusMode,
	onOpenVersionHistory,
	workspaceMode,
	onWorkspaceModeChange,
	settingsTabRequest,
	onSettingsTabRequestHandled,
	onOpenFindReplace,
	typewriterMode = false,
	onToggleTypewriterMode,
	scriptStatsLabel,
	collaborators = [],
	collaborationActive = false,
}: TopBarProps) {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [shareOpen, setShareOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab | undefined>(undefined);
	const [penName, setPenName] = useState(() => loadPenName());
	const [profileImageDataUrl, setProfileImageDataUrl] = useState<string | null>(() => loadProfileImage());
	const importInputRef = useRef<HTMLInputElement | null>(null);
	const isDark = resolvedTheme === 'dark';
	const chrome = getEditorTheme(isDark);

	useEffect(() => {
		if (!settingsTabRequest) {
			return;
		}

		setSettingsInitialTab(settingsTabRequest);
		setSettingsOpen(true);
		onSettingsTabRequestHandled?.();
	}, [onSettingsTabRequestHandled, settingsTabRequest]);

	useEffect(() => {
		if (!settingsOpen) {
			// Settings may have changed the profile while open.
			setPenName(loadPenName());
			setProfileImageDataUrl(loadProfileImage());
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setSettingsOpen(false);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [settingsOpen]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === ',') {
				const target = event.target;

				if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
					return;
				}

				event.preventDefault();
				setSettingsInitialTab(undefined);
				setSettingsOpen(true);
				return;
			}

			if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 't') {
				event.preventDefault();
				onToggleTypewriterMode?.();
				return;
			}

			if (event.key === '?' && !event.metaKey && !event.ctrlKey) {
				const target = event.target;

				if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
					return;
				}

				event.preventDefault();
				setShortcutsOpen(true);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [onToggleTypewriterMode]);

	const saveIndicatorLabel =
		saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved';

	return (
		<>
			<header className={`relative z-[70] flex h-12 shrink-0 items-center gap-3 border-b px-4 text-sm ${chrome.topBar} ${isDark ? 'dark' : ''}`}>
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<DropdownMenu key={documentId}>
					<DropdownMenuTrigger
						aria-label="Open menu"
						className={cn(
							'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-slate-300',
						)}
						type="button"
					>
						<span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
							D
						</span>
						<Menu size={16} strokeWidth={2.25} />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="z-[100] w-52">
						{onBackToHub ? <DropdownMenuItem onClick={onBackToHub}>Library</DropdownMenuItem> : null}
						{onNewDocument ? <DropdownMenuItem onClick={onNewDocument}>New script</DropdownMenuItem> : null}
						<DropdownMenuItem onClick={() => importInputRef.current?.click()}>Import</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setShareOpen(true)}>Share</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuLabel>Export</DropdownMenuLabel>
							<DropdownMenuItem onClick={() => onExport('fountain')}>Fountain (.fountain)</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onExport('text')}>Plain text (.txt)</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onExport('fdx')}>Final Draft (.fdx)</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onExport('pdf')}>PDF (print)</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onToggleFocusMode}>
							{focusMode ? 'Exit focus mode' : 'Focus mode'}
						</DropdownMenuItem>
						{onToggleTypewriterMode ? (
							<DropdownMenuItem onClick={onToggleTypewriterMode}>
								Typewriter mode
								{typewriterMode ? <Check className="ml-auto size-4" /> : null}
							</DropdownMenuItem>
						) : null}
						<DropdownMenuItem onClick={onOpenVersionHistory}>Version history</DropdownMenuItem>
						{onOpenFindReplace ? (
							<DropdownMenuItem onClick={onOpenFindReplace}>Find and replace</DropdownMenuItem>
						) : null}
						<DropdownMenuItem onClick={() => setShortcutsOpen(true)}>Keyboard shortcuts</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<input
					ref={importInputRef}
					className="hidden"
					type="file"
					accept=".fountain,.txt,.fdx,.pdf,text/plain,text/xml,application/xml,application/pdf"
					onChange={(event) => {
						const file = event.target.files?.[0];

						if (file) {
							onImport(file);
						}

						event.target.value = '';
					}}
				/>

				<input
					aria-label="Document title"
					className="min-w-0 max-w-[10rem] bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground sm:max-w-[12rem] xl:max-w-xs"
					placeholder="Untitled script"
					spellCheck={false}
					value={title}
					onChange={(event) => onTitleChange(event.target.value)}
				/>
				</div>

				{!focusMode ? (
					<div className="pointer-events-none absolute inset-x-0 flex justify-center max-md:hidden">
						<div className="pointer-events-auto">
							<EditorWorkspaceNav
								workspaceMode={workspaceMode}
								resolvedTheme={resolvedTheme}
								onModeChange={onWorkspaceModeChange}
							/>
						</div>
					</div>
				) : null}

				<div className="flex min-w-0 flex-1 items-center justify-end gap-2">
					{collaborationActive ? (
						<CollaboratorAvatars peers={collaborators} className="mr-1 hidden sm:flex" />
					) : null}
					{typewriterMode ? (
						<span
							className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground"
							title="Typewriter mode"
						>
							TW
						</span>
					) : null}
					{scriptStatsLabel ? (
						<span className="hidden text-xs tabular-nums text-muted-foreground md:inline">{scriptStatsLabel}</span>
					) : null}
					<LocalAccountBadge className="hidden sm:inline-flex" />
					<div
						aria-label={saveIndicatorLabel}
						className="flex items-center gap-1.5 text-xs text-muted-foreground"
						role="status"
						title={saveIndicatorLabel}
					>
						<span
							className={`flex size-6 items-center justify-center rounded-full ${
								saveStatus === 'saved'
									? 'text-emerald-600'
									: saveStatus === 'saving'
										? 'text-muted-foreground'
										: 'text-amber-600'
							}`}
						>
							{saveStatus === 'saving' ? (
								<Loader2 className="animate-spin" size={14} strokeWidth={2.25} />
							) : saveStatus === 'saved' ? (
								<Check size={14} strokeWidth={2.5} />
							) : (
								<span className="size-2 rounded-full bg-current" />
							)}
						</span>
						<span className="hidden sm:inline">{saveIndicatorLabel}</span>
					</div>
					<button
						className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-[10px] font-semibold transition hover:bg-accent"
						type="button"
						aria-label="Open settings"
						onClick={() => {
							setSettingsInitialTab(undefined);
							setSettingsOpen(true);
						}}
					>
						{profileImageDataUrl ? (
							<img alt="" className="size-full object-cover" src={profileImageDataUrl} />
						) : (
							penName.slice(0, 2).toUpperCase()
						)}
					</button>
				</div>
			</header>

			{settingsOpen ? (
				<div
					className="fixed inset-0 z-[60] bg-black/30 px-4 py-6"
					onMouseDown={(event) => {
						if (event.target === event.currentTarget) {
							setSettingsOpen(false);
						}
					}}
				>
					<UserSettingsPanel
						theme={theme}
						resolvedTheme={resolvedTheme}
						onThemeChange={onThemeChange}
						initialTab={settingsInitialTab}
						onClose={() => {
							setSettingsOpen(false);
							setSettingsInitialTab(undefined);
						}}
					/>
				</div>
			) : null}

			<ShareDialog
				open={shareOpen}
				title={title.trim() || 'Untitled Script'}
				documentId={documentId}
				isDark={resolvedTheme === 'dark'}
				onClose={() => setShareOpen(false)}
				onOpenAddressBook={() => {
					setShareOpen(false);
					setSettingsInitialTab('addressBook');
					setSettingsOpen(true);
				}}
			/>

			<ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
		</>
	);
}
