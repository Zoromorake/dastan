import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type ShortcutGroup = {
	title: string;
	items: Array<[string, string]>;
};

interface ShortcutsModalProps {
	open: boolean;
	onClose: () => void;
	groups?: ShortcutGroup[];
}

const editorShortcutGroups: ShortcutGroup[] = [
	{
		title: 'Writing',
		items: [
			['TAB', 'Cycle to next element'],
			['SHIFT + TAB', 'Cycle to previous element'],
			['ENTER', 'Advance to next block'],
			['SHIFT + ENTER', 'Insert alternate block'],
			['⌘Z', 'Undo'],
			['⌘⇧Z', 'Redo'],
		],
	},
	{
		title: 'Elements',
		items: [
			['⌘1', 'Scene Heading'],
			['⌘2', 'Action'],
			['⌘3', 'Character'],
			['⌘4', 'Dialogue'],
			['⌘5', 'Parenthetical'],
			['⌘6', 'Transition'],
			['⌘7', 'Centered'],
			['⌘8', 'Shot'],
			['⌘9', 'General'],
			['⌘0', 'Lyrics'],
		],
	},
	{
		title: 'Navigation',
		items: [
			['⌘K', 'Command palette'],
			['⌘,', 'Settings'],
			['?', 'Keyboard shortcuts'],
		],
	},
	{
		title: 'Workspace',
		items: [
			['⌘S', 'Save'],
			['⌘F', 'Find and replace'],
			['⌘G', 'Find next match'],
			['⌘⇧G', 'Find previous match'],
			['⌘\\', 'Toggle sidebar'],
			['⌘L', 'Toggle AI chat'],
			['⌘⇧T', 'Typewriter mode'],
			['⌘.', 'Focus mode'],
		],
	},
];

export const hubShortcutGroups: ShortcutGroup[] = [
	{
		title: 'Library',
		items: [
			['⌘K', 'Command palette'],
			['⌘L', 'Toggle AI chat'],
			['⌘,', 'Settings'],
			['?', 'Keyboard shortcuts'],
		],
	},
	{
		title: 'Scripts',
		items: [
			['Enter / Space', 'Open focused script'],
			['Click', 'Open script'],
		],
	},
];

export function ShortcutsModal({ open, onClose, groups = editorShortcutGroups }: ShortcutsModalProps) {
	return (
		<Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Keyboard shortcuts</DialogTitle>
					<DialogDescription>Common actions available in this view.</DialogDescription>
				</DialogHeader>
				<div className="grid gap-6 sm:grid-cols-2">
					{groups.map((group) => (
						<div key={group.title}>
							<h3 className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
								{group.title}
							</h3>
							<ul className="space-y-1.5">
								{group.items.map(([keys, label]) => (
									<li key={`${group.title}-${keys}`} className="flex items-center justify-between gap-3 text-sm">
										<span className="text-muted-foreground">{label}</span>
										<kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
											{keys}
										</kbd>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
