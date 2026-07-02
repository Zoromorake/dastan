import type {
	CollaborationChatMessage,
	CollaborationRoom,
	CollaborationService,
	CollaboratorPresence,
} from '@dastan/plugin-api';

function createNoOpRoom(documentId: string): CollaborationRoom {
	const peerListeners = new Set<(peers: CollaboratorPresence[]) => void>();
	const chatListeners = new Set<(message: CollaborationChatMessage) => void>();

	return {
		documentId,
		roomId: documentId,
		connect() {
			return () => {};
		},
		onPeersChange(callback) {
			peerListeners.add(callback);
			callback([]);
			return () => {
				peerListeners.delete(callback);
			};
		},
		subscribeChatMessages(callback) {
			chatListeners.add(callback);
			return () => {
				chatListeners.delete(callback);
			};
		},
		async publishChatMessage() {
			// Local-only mode: chat stays in IndexedDB per device.
		},
	};
}

const openRooms = new Map<string, CollaborationRoom>();

export const localCollaborationService: CollaborationService = {
	isAvailable() {
		return false;
	},
	openRoom(documentId) {
		const existing = openRooms.get(documentId);

		if (existing) {
			return existing;
		}

		const room = createNoOpRoom(documentId);
		openRooms.set(documentId, room);
		return room;
	},
	closeRoom(documentId) {
		openRooms.delete(documentId);
	},
};
