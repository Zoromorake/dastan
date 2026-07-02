/**
 * Opaque Yjs Y.Doc handle — typed in the editor layer to avoid a hard yjs dependency here.
 */
export type CollaborationDoc = unknown;

/**
 * Opaque y-protocols Awareness handle — typed in the editor layer.
 */
export type CollaborationAwareness = unknown;

export interface CollaboratorPresence {
	userId: string;
	name: string;
	color: string;
	cursorBlockIndex?: number;
	lastActiveAt: string;
}

export interface CollaborationChatMessage {
	id: string;
	threadId: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	createdAt: string;
	senderUserId?: string;
}

export interface CollaborationRoom {
	documentId: string;
	/** Stable room id for shared AI chat threads (defaults to documentId). */
	roomId: string;
	connect(doc: CollaborationDoc, awareness: CollaborationAwareness): () => void;
	onPeersChange(callback: (peers: CollaboratorPresence[]) => void): () => void;
	subscribeChatMessages(callback: (message: CollaborationChatMessage) => void): () => void;
	publishChatMessage(message: CollaborationChatMessage): Promise<void>;
}

export interface CollaborationService {
	isAvailable(): boolean;
	openRoom(documentId: string): CollaborationRoom;
	closeRoom(documentId: string): void;
}
