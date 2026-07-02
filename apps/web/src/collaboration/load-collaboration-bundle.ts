import type { Extensions } from '@tiptap/core';
import type {
	CollaborationAwareness,
	CollaborationDoc,
	CollaborationRoom,
	CollaboratorPresence,
} from '@dastan/plugin-api';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';

const COLLABORATOR_COLORS = [
	'#f97316',
	'#22c55e',
	'#3b82f6',
	'#a855f7',
	'#ec4899',
	'#14b8a6',
	'#eab308',
];

export function collaboratorColorForUser(userId: string): string {
	let hash = 0;

	for (let index = 0; index < userId.length; index += 1) {
		hash = (hash + userId.charCodeAt(index) * (index + 1)) % COLLABORATOR_COLORS.length;
	}

	return COLLABORATOR_COLORS[hash] ?? COLLABORATOR_COLORS[0]!;
}

export interface CollaborationBundle {
	ydoc: Y.Doc;
	awareness: Awareness;
	extensions: Extensions;
	disconnect: () => void;
}

export interface SetupCollaborationOptions {
	documentId: string;
	room: CollaborationRoom;
	user: {
		id: string;
		name: string;
	};
	excludeHistoryFrom: Extensions;
}

/**
 * Dynamically loads Yjs + TipTap collaboration extensions (code-split chunk).
 */
export async function setupCollaborationEditor(
	options: SetupCollaborationOptions,
): Promise<CollaborationBundle> {
	const { createCollaborationExtensions } = await import('@dastan/editor/collaboration');

	const ydoc = new Y.Doc();
	const awareness = new Awareness(ydoc);
	const color = collaboratorColorForUser(options.user.id);

	awareness.setLocalStateField('user', {
		name: options.user.name,
		color,
	});

	const disconnectTransport = options.room.connect(ydoc as CollaborationDoc, awareness as CollaborationAwareness);

	const extensions = createCollaborationExtensions({
		document: ydoc,
		awareness,
		user: {
			name: options.user.name,
			color,
		},
	});

	return {
		ydoc,
		awareness,
		extensions,
		disconnect: () => {
			disconnectTransport();
			awareness.destroy();
			ydoc.destroy();
		},
	};
}

export function mapAwarenessToPeers(awareness: Awareness, localUserId: string): CollaboratorPresence[] {
	const peers: CollaboratorPresence[] = [];
	const now = new Date().toISOString();

	awareness.getStates().forEach((state, clientId) => {
		if (clientId === awareness.clientID) {
			return;
		}

		const user = state.user as { name?: string; color?: string; cursorBlockIndex?: number } | undefined;

		if (!user?.name) {
			return;
		}

		peers.push({
			userId: `client-${clientId}`,
			name: user.name,
			color: user.color ?? collaboratorColorForUser(`client-${clientId}`),
			cursorBlockIndex: user.cursorBlockIndex,
			lastActiveAt: now,
		});
	});

	if (peers.length === 0 && localUserId) {
		// Solo in room — no remote peers yet.
	}

	return peers;
}
