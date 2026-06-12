import { cn } from '@/lib/utils';
import type { DevelopSubTab, WorldSubTab, WorkspaceMode } from '../types/workspace-navigation';
import { DEVELOP_SUB_TABS, WORLD_SUB_TABS } from '../types/workspace-navigation';

interface EditorWorkspaceSubNavProps {
	workspaceMode: Exclude<WorkspaceMode, 'script'>;
	activeDevelopSubTab: DevelopSubTab;
	activeWorldSubTab: WorldSubTab;
	resolvedTheme: 'light' | 'dark';
	onDevelopSubTabChange: (tab: DevelopSubTab) => void;
	onWorldSubTabChange: (tab: WorldSubTab) => void;
}

function getSubTabClassName(isActive: boolean, isDark: boolean) {
	return cn(
		'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm',
		isActive
			? isDark
				? 'bg-primary/25 font-semibold text-amber-300 ring-1 ring-primary/40'
				: 'bg-primary/15 font-semibold text-amber-900 ring-1 ring-primary/30'
			: 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
	);
}

export function EditorWorkspaceSubNav({
	workspaceMode,
	activeDevelopSubTab,
	activeWorldSubTab,
	resolvedTheme,
	onDevelopSubTabChange,
	onWorldSubTabChange,
}: EditorWorkspaceSubNavProps) {
	const isDark = resolvedTheme === 'dark';
	const tabs = workspaceMode === 'develop' ? DEVELOP_SUB_TABS : WORLD_SUB_TABS;
	const activeId = workspaceMode === 'develop' ? activeDevelopSubTab : activeWorldSubTab;
	const centerSubTabs = workspaceMode === 'develop';

	return (
		<nav
			aria-label={workspaceMode === 'develop' ? 'Develop sections' : 'World sections'}
			className="flex w-full min-w-0 items-center justify-center gap-1 overflow-x-auto"
		>
			<div className={cn('inline-flex min-w-0 items-center gap-1', centerSubTabs && 'mx-auto justify-center')}>
				{tabs.map((tab) => {
					const isActive = tab.id === activeId;

					return (
						<button
							key={tab.id}
							aria-current={isActive ? 'page' : undefined}
							className={getSubTabClassName(isActive, isDark)}
							type="button"
							onClick={() => {
								if (workspaceMode === 'develop') {
									onDevelopSubTabChange(tab.id as DevelopSubTab);
									return;
								}

								onWorldSubTabChange(tab.id as WorldSubTab);
							}}
						>
							{tab.label}
						</button>
					);
				})}
			</div>
		</nav>
	);
}
