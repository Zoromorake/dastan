import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Menu } from 'lucide-react';
import type { ScreenplaySaveStatus } from '../types';
import { EditorWorkspaceNav } from './EditorWorkspaceNav';
import type { WorkspaceTab } from './ScreenplayWorkspacePanel';
import { ShareDialog } from './ShareDialog';
import { ShortcutsModal } from './ShortcutsModal';
import { UserSettingsPanel } from './UserSettingsPanel';
import type { SettingsTab, UserThemeSetting } from './UserSettingsPanel';

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
	activeWorkspaceTab: WorkspaceTab;
	onWorkspaceTabChange: (tab: WorkspaceTab) => void;
	settingsTabRequest?: SettingsTab | null;
	onSettingsTabRequestHandled?: () => void;
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
	activeWorkspaceTab,
	onWorkspaceTabChange,
	settingsTabRequest,
	onSettingsTabRequestHandled,
}: TopBarProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [shareOpen, setShareOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab | undefined>(undefined);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const importInputRef = useRef<HTMLInputElement | null>(null);
	const isDark = resolvedTheme === 'dark';

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
	}, []);

	useEffect(() => {
		if (!menuOpen) {
			return;
		}

		const handleMouseDown = (event: MouseEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		};

		window.addEventListener('mousedown', handleMouseDown);
		return () => {
			window.removeEventListener('mousedown', handleMouseDown);
		};
	}, [menuOpen]);

	const topBarClass = isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-stone-300 bg-[#f6f2ea] text-stone-900';
	const menuClass = isDark
		? 'absolute left-0 top-[calc(100%+8px)] z-30 min-w-[14rem] rounded-2xl border border-slate-700 bg-slate-900 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.35)]'
		: 'absolute left-0 top-[calc(100%+8px)] z-30 min-w-[14rem] rounded-2xl border border-stone-300 bg-white py-1 shadow-[0_12px_40px_rgba(28,25,23,0.12)]';
	const menuItemClass = isDark
		? 'block w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800'
		: 'block w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100';
	const menuSectionClass = isDark
		? 'px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500'
		: 'px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-stone-500';
	const menuDividerClass = isDark ? 'my-1 border-t border-slate-700' : 'my-1 border-t border-stone-200';
	const logoButtonClass = isDark
		? 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-slate-100 transition hover:bg-amber-500'
		: 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-neutral-950 transition hover:bg-amber-300';
	const titleInputClass = isDark
		? 'min-w-0 flex-1 bg-transparent text-base font-medium text-slate-100 outline-none placeholder:text-slate-500'
		: 'min-w-0 flex-1 bg-transparent text-base font-medium text-stone-900 outline-none placeholder:text-stone-400';
	const userButtonClass = isDark
		? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-500 bg-slate-800 text-[10px] font-semibold text-slate-100'
		: 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-[10px] font-semibold text-stone-700';
	const saveIndicatorLabel =
		saveStatus === 'saved' ? 'All changes saved' : saveStatus === 'saving' ? 'Saving changes' : 'Unsaved changes';

	const closeMenu = () => setMenuOpen(false);

	return (
		<>
			<header className={`relative flex h-14 shrink-0 items-center gap-4 border-b px-5 text-sm ${topBarClass}`}>
				<div ref={menuRef} className="relative shrink-0">
					<button
						aria-expanded={menuOpen}
						aria-haspopup="menu"
						aria-label="Open menu"
						className="inline-flex items-center gap-1.5 rounded-lg px-0.5 py-0.5 transition hover:opacity-80"
						type="button"
						onClick={() => setMenuOpen((open) => !open)}
					>
						<span className={`${logoButtonClass} text-xs font-black`}>D</span>
						<Menu className={isDark ? 'text-slate-300' : 'text-stone-600'} size={18} strokeWidth={2.25} />
					</button>

					{menuOpen ? (
						<div className={menuClass} role="menu">
							{onBackToHub ? (
								<button className={menuItemClass} type="button" role="menuitem" onClick={() => { onBackToHub(); closeMenu(); }}>
									Hub
								</button>
							) : null}
							{onNewDocument ? (
								<button className={menuItemClass} type="button" role="menuitem" onClick={() => { onNewDocument(); closeMenu(); }}>
									New Script
								</button>
							) : null}
							<button
								className={menuItemClass}
								type="button"
								role="menuitem"
								onClick={() => {
									importInputRef.current?.click();
									closeMenu();
								}}
							>
								Import
							</button>
							<button
								className={menuItemClass}
								type="button"
								role="menuitem"
								onClick={() => {
									setShareOpen(true);
									closeMenu();
								}}
							>
								Share
							</button>

							<div className={menuDividerClass} />
							<p className={menuSectionClass}>Export</p>
							{(['fountain', 'text', 'fdx', 'pdf'] as const).map((format) => (
								<button
									key={format}
									className={menuItemClass}
									type="button"
									role="menuitem"
									onClick={() => {
										onExport(format);
										closeMenu();
									}}
								>
									{format === 'fountain' ? 'Fountain (.fountain)' : format === 'text' ? 'Plain Text (.txt)' : format === 'fdx' ? 'Final Draft (.fdx)' : 'PDF (print)'}
								</button>
							))}

							<div className={menuDividerClass} />
							<button
								className={`${menuItemClass} ${focusMode ? (isDark ? 'text-amber-400' : 'text-amber-700') : ''}`}
								type="button"
								role="menuitem"
								onClick={() => {
									onToggleFocusMode();
									closeMenu();
								}}
							>
								{focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
							</button>
							<button
								className={menuItemClass}
								type="button"
								role="menuitem"
								onClick={() => {
									onOpenVersionHistory();
									closeMenu();
								}}
							>
								Version History
							</button>
							<button
								className={menuItemClass}
								type="button"
								role="menuitem"
								onClick={() => {
									setShortcutsOpen(true);
									closeMenu();
								}}
							>
								Keyboard Shortcuts
							</button>
						</div>
					) : null}

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
				</div>

				<input
					aria-label="Document title"
					className={`${titleInputClass} max-w-[14rem] xl:max-w-xs`}
					placeholder="Untitled Script"
					spellCheck={false}
					value={title}
					onChange={(event) => onTitleChange(event.target.value)}
				/>

				{!focusMode ? (
					<div className="hidden min-w-0 flex-1 justify-center md:flex">
						<EditorWorkspaceNav
							activeTab={activeWorkspaceTab}
							resolvedTheme={resolvedTheme}
							onTabChange={onWorkspaceTabChange}
						/>
					</div>
				) : null}

				<div className="flex shrink-0 items-center gap-3">
					<div
						aria-label={saveIndicatorLabel}
						className={`flex h-8 w-8 items-center justify-center rounded-full border ${
							saveStatus === 'saved'
								? isDark
									? 'border-emerald-600/60 bg-emerald-950/40 text-emerald-400'
									: 'border-emerald-300 bg-emerald-50 text-emerald-600'
								: saveStatus === 'saving'
									? isDark
										? 'border-slate-500 bg-slate-800 text-slate-300'
										: 'border-stone-300 bg-white text-stone-500'
									: isDark
										? 'border-amber-600/50 bg-amber-950/30 text-amber-400'
										: 'border-amber-300 bg-amber-50 text-amber-600'
						}`}
						role="status"
						title={saveIndicatorLabel}
					>
						{saveStatus === 'saving' ? (
							<Loader2 className="animate-spin" size={16} strokeWidth={2.25} />
						) : saveStatus === 'saved' ? (
							<Check size={16} strokeWidth={2.5} />
						) : (
							<span className="h-2 w-2 rounded-full bg-current" />
						)}
					</div>
					<button
						className={userButtonClass}
						type="button"
						aria-label="User"
						onClick={() => {
							setSettingsInitialTab(undefined);
							setSettingsOpen(true);
						}}
					>
						AQ
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
