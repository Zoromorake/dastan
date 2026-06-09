import {
	FileText,
	LayoutGrid,
	List,
	MapPin,
	StickyNote,
	Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WorkspaceTab } from './ScreenplayWorkspacePanel';

const workspaceTabs: Array<{ id: WorkspaceTab; label: string; shortLabel: string; icon: LucideIcon }> = [
	{ id: 'Script', label: 'Script', shortLabel: 'Script', icon: FileText },
	{ id: 'Outline', label: 'Outline', shortLabel: 'Outline', icon: List },
	{ id: 'Beat Board', label: 'Beat Board', shortLabel: 'Beats', icon: LayoutGrid },
	{ id: 'Characters', label: 'Characters', shortLabel: 'Cast', icon: Users },
	{ id: 'Locations', label: 'Locations', shortLabel: 'Locs', icon: MapPin },
	{ id: 'Notes', label: 'Notes', shortLabel: 'Notes', icon: StickyNote },
];

interface EditorWorkspaceNavProps {
	activeTab: WorkspaceTab;
	resolvedTheme: 'light' | 'dark';
	onTabChange: (tab: WorkspaceTab) => void;
}

export function EditorWorkspaceNav({ activeTab, resolvedTheme, onTabChange }: EditorWorkspaceNavProps) {
	const isDark = resolvedTheme === 'dark';
	const shellClass = isDark
		? 'flex items-center gap-0.5 overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/80 p-1'
		: 'flex items-center gap-0.5 overflow-x-auto rounded-xl border border-stone-300 bg-stone-100/80 p-1';

	return (
		<nav aria-label="Workspace" className={shellClass}>
			{workspaceTabs.map((tab) => {
				const Icon = tab.icon;
				const isActive = tab.id === activeTab;

				return (
					<button
						key={tab.id}
						aria-current={isActive ? 'page' : undefined}
						className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:px-3 ${
							isActive
								? isDark
									? 'bg-slate-700 text-slate-100 shadow-sm'
									: 'bg-white text-stone-900 shadow-sm'
								: isDark
									? 'text-slate-400 hover:text-slate-200'
									: 'text-stone-500 hover:text-stone-800'
						}`}
						type="button"
						onClick={() => onTabChange(tab.id)}
					>
						<Icon size={14} strokeWidth={2.1} />
						<span className="hidden sm:inline">{tab.label}</span>
						<span className="sm:hidden">{tab.shortLabel}</span>
					</button>
				);
			})}
		</nav>
	);
}
