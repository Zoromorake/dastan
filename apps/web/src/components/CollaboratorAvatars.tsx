import type { CollaboratorPresence } from '@dastan/plugin-api';
import { cn } from '@/lib/utils';

interface CollaboratorAvatarsProps {
	peers: CollaboratorPresence[];
	className?: string;
}

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);

	if (parts.length === 0) {
		return '?';
	}

	if (parts.length === 1) {
		return parts[0]!.slice(0, 2).toUpperCase();
	}

	return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function CollaboratorAvatars({ peers, className }: CollaboratorAvatarsProps) {
	if (peers.length === 0) {
		return null;
	}

	const visiblePeers = peers.slice(0, 4);
	const overflowCount = peers.length - visiblePeers.length;

	return (
		<div className={cn('flex items-center -space-x-2', className)} aria-label="Active collaborators">
			{visiblePeers.map((peer) => (
				<span
					key={`${peer.userId}-${peer.name}`}
					className="inline-flex size-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold text-white shadow-sm"
					style={{ backgroundColor: peer.color }}
					title={peer.name}
				>
					{initials(peer.name)}
				</span>
			))}
			{overflowCount > 0 ? (
				<span className="inline-flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
					+{overflowCount}
				</span>
			) : null}
		</div>
	);
}
