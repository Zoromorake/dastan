import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShortcutsModalProps {
	open: boolean;
	onClose: () => void;
}

const shortcutGroups = [
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
		title: 'Workspace',
		items: [
			['⌘S', 'Save'],
			['⌘F', 'Find and replace'],
			['⌘G', 'Find next match'],
			['⌘⇧G', 'Find previous match'],
			['⌘\\', 'Toggle sidebar'],
			['⌘L', 'Toggle AI chat'],
			['⌘.', 'Focus mode'],
			['?', 'Keyboard shortcuts'],
		],
	},
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
	return (
		<Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Keyboard Shortcuts</DialogTitle>
					<DialogDescription>Fast navigation for script writing in Dastan.</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 md:grid-cols-3">
					{shortcutGroups.map((group) => (
						<section key={group.title} className="rounded-2xl border p-4">
							<h3 className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{group.title}</h3>
							<div className="space-y-2 text-sm">
								{group.items.map(([keys, description]) => (
									<div key={keys} className="flex items-start justify-between gap-3">
										<span className="rounded-md border bg-muted px-2 py-1 font-mono text-[11px]">{keys}</span>
										<span className="text-right text-muted-foreground">{description}</span>
									</div>
								))}
							</div>
						</section>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
