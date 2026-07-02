import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ShareContact } from '../utils/share-contacts';

function contactInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);

	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
	}

	return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

interface ShareContactRowProps {
	contact: ShareContact;
	isDark: boolean;
	selectable?: boolean;
	selected?: boolean;
	onToggleSelect?: (contactId: string, checked: boolean) => void;
	onEdit?: (contact: ShareContact) => void;
	onRemove?: (contactId: string) => void;
}

export function ShareContactRow({
	contact,
	isDark,
	selectable = false,
	selected = false,
	onToggleSelect,
	onEdit,
	onRemove,
}: ShareContactRowProps) {
	const rowClass = isDark
		? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'
		: 'border-stone-200 bg-white hover:bg-stone-50';

	return (
		<div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${rowClass}`}>
			{selectable ? (
				<input
					checked={selected}
					className="size-4 shrink-0 rounded accent-amber-600"
					type="checkbox"
					onChange={(event) => onToggleSelect?.(contact.id, event.target.checked)}
				/>
			) : null}

			<span
				className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
					isDark ? 'bg-slate-700 text-amber-200' : 'bg-amber-100 text-amber-900'
				}`}
			>
				{contactInitials(contact.name)}
			</span>

			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<p className={`truncate text-sm font-medium ${isDark ? 'text-slate-100' : 'text-stone-900'}`}>{contact.name}</p>
					{contact.role ? <Badge variant="secondary">{contact.role}</Badge> : null}
				</div>
				<p className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>{contact.email}</p>
			</div>

			{onEdit || onRemove ? (
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button aria-label={`Actions for ${contact.name}`} size="icon-sm" type="button" variant="ghost">
								<MoreHorizontal size={16} />
							</Button>
						}
					/>
					<DropdownMenuContent align="end">
						{onEdit ? (
							<DropdownMenuItem onClick={() => onEdit(contact)}>
								<Pencil size={14} />
								Edit
							</DropdownMenuItem>
						) : null}
						{onRemove ? (
							<DropdownMenuItem variant="destructive" onClick={() => onRemove(contact.id)}>
								<Trash2 size={14} />
								Remove
							</DropdownMenuItem>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}
		</div>
	);
}
