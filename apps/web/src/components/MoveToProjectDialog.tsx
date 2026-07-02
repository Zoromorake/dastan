import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ScreenplayProjectRecord } from '../types';
import { flattenProjectsForMove } from '../utils/hub-folder-utils';

interface MoveToProjectDialogProps {
	open: boolean;
	documentTitle: string;
	projects: ScreenplayProjectRecord[];
	currentProjectId?: string;
	onMove: (projectId: string | null) => void;
	onClose: () => void;
}

export function MoveToProjectDialog({
	open,
	documentTitle,
	projects,
	currentProjectId,
	onMove,
	onClose,
}: MoveToProjectDialogProps) {
	const flattenedProjects = flattenProjectsForMove(projects);

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Move to folder</DialogTitle>
					<DialogDescription>Choose where to file &ldquo;{documentTitle || 'Untitled'}&rdquo;.</DialogDescription>
				</DialogHeader>
				<div className="max-h-72 space-y-2 overflow-y-auto">
					<button
						className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition hover:border-amber-300 hover:bg-amber-50 ${currentProjectId ? '' : 'border-emerald-300 bg-emerald-50'}`}
						type="button"
						onClick={() => onMove(null)}
					>
						<span className="font-medium">Library (no folder)</span>
					</button>
					{flattenedProjects.map(({ project, depth, pathLabel }) => (
						<button
							key={project.id}
							className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition hover:border-amber-300 hover:bg-amber-50 ${currentProjectId === project.id ? 'border-emerald-300 bg-emerald-50' : ''}`}
							style={{ marginLeft: `${depth * 12}px`, width: `calc(100% - ${depth * 12}px)` }}
							type="button"
							onClick={() => onMove(project.id)}
						>
							<span className="font-medium">{project.title || 'Untitled Project'}</span>
							{depth > 0 ? <span className="mt-0.5 block text-xs text-muted-foreground">{pathLabel}</span> : null}
						</button>
					))}
				</div>
				<DialogFooter>
					<Button variant="outline" type="button" onClick={onClose}>
						Cancel
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
