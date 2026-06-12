import { FileText, Layers, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkspaceMode } from '../types/workspace-navigation';

const mainTabs: Array<{ id: WorkspaceMode; label: string; icon: LucideIcon }> = [
	{ id: 'develop', label: 'Develop', icon: Layers },
	{ id: 'script', label: 'Script', icon: FileText },
	{ id: 'world', label: 'World', icon: Users },
];

interface EditorWorkspaceNavProps {
	workspaceMode: WorkspaceMode;
	resolvedTheme: 'light' | 'dark';
	onModeChange: (mode: WorkspaceMode) => void;
}

function getMainTabClassName(isActive: boolean, isDark: boolean, isScript: boolean) {
	return cn(
		'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition',
		isScript && 'sm:px-5',
		isActive
			? isDark
				? 'bg-primary/25 font-semibold text-amber-300 shadow-sm ring-1 ring-primary/40'
				: 'bg-primary/15 font-semibold text-amber-900 shadow-sm ring-1 ring-primary/30'
			: 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
	);
}

export function EditorWorkspaceNav({ workspaceMode, resolvedTheme, onModeChange }: EditorWorkspaceNavProps) {
	const isDark = resolvedTheme === 'dark';

	return (
		<nav aria-label="Workspace" className="inline-flex items-center gap-1">
			{mainTabs.map((tab) => {
				const Icon = tab.icon;
				const isActive = tab.id === workspaceMode;
				const isScript = tab.id === 'script';

				return (
					<button
						key={tab.id}
						aria-current={isActive ? 'page' : undefined}
						className={getMainTabClassName(isActive, isDark, isScript)}
						type="button"
						onClick={() => onModeChange(tab.id)}
					>
						<Icon size={16} strokeWidth={2.1} />
						<span>{tab.label}</span>
					</button>
				);
			})}
		</nav>
	);
}
