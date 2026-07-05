import { ArrowDown, ArrowUp, MoreHorizontal } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getEditorTheme } from '../utils/editor-theme';

interface ScriptActionsMenuProps {
	resolvedTheme: 'light' | 'dark';
	showSceneNumbers: boolean;
	showChangeMarks: boolean;
	showCharacterHighlighting: boolean;
	showStructureLines: boolean;
	canMoveSceneUp: boolean;
	canMoveSceneDown: boolean;
	onExport: (format: 'fountain' | 'text' | 'fdx' | 'pdf') => void;
	onToggleSceneNumbers: () => void;
	onToggleChangeMarks: () => void;
	onToggleCharacterHighlighting: () => void;
	onToggleStructureLines: () => void;
	onOpenReports: () => void;
	onMoveSceneUp: () => void;
	onMoveSceneDown: () => void;
}

export function ScriptActionsMenu({
	resolvedTheme,
	showSceneNumbers,
	showChangeMarks,
	showCharacterHighlighting,
	showStructureLines,
	canMoveSceneUp,
	canMoveSceneDown,
	onExport,
	onToggleSceneNumbers,
	onToggleChangeMarks,
	onToggleCharacterHighlighting,
	onToggleStructureLines,
	onOpenReports,
	onMoveSceneUp,
	onMoveSceneDown,
}: ScriptActionsMenuProps) {
	const isDark = resolvedTheme === 'dark';
	const theme = getEditorTheme(isDark);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition ${theme.statusPill}`}
				type="button"
				aria-label="Script actions"
			>
				<MoreHorizontal size={16} strokeWidth={2.25} />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="z-[100] w-56">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Export</DropdownMenuLabel>
					<DropdownMenuItem onClick={() => onExport('fountain')}>Fountain (.fountain)</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onExport('text')}>Plain text (.txt)</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onExport('fdx')}>Final Draft (.fdx)</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onExport('pdf')}>PDF (print)</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>View</DropdownMenuLabel>
					<DropdownMenuItem onClick={onToggleChangeMarks}>
						{showChangeMarks ? 'Hide change marks' : 'Show change marks'}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onToggleCharacterHighlighting}>
						{showCharacterHighlighting ? 'Hide character colors' : 'Show character colors'}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onToggleStructureLines}>
						{showStructureLines ? 'Hide structure lines' : 'Show structure lines'}
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Reports</DropdownMenuLabel>
					<DropdownMenuItem onClick={onOpenReports}>Production reports…</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Scenes</DropdownMenuLabel>
					<DropdownMenuItem onClick={onToggleSceneNumbers}>
						{showSceneNumbers ? 'Hide scene numbers' : 'Show scene numbers'}
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!canMoveSceneUp} onClick={onMoveSceneUp}>
						<ArrowUp />
						Move scene up
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!canMoveSceneDown} onClick={onMoveSceneDown}>
						<ArrowDown />
						Move scene down
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
