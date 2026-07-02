import type { CollaborationChatMessage } from '@dastan/plugin-api';
import type { AiChatMessage } from '@dastan/local-storage';

export function toCollaborationChatMessage(
	threadId: string,
	message: AiChatMessage,
	senderUserId?: string,
): CollaborationChatMessage {
	return {
		id: message.id,
		threadId,
		role: message.role,
		content: message.content,
		createdAt: message.createdAt,
		senderUserId,
	};
}

export function fromCollaborationChatMessage(message: CollaborationChatMessage): AiChatMessage {
	return {
		id: message.id,
		role: message.role,
		content: message.content,
		createdAt: message.createdAt,
	};
}

/**
 * Merges a locally persisted message list with a live collaboration broadcast,
 * deduplicating by message id.
 */
export function mergeCollaborationChatMessages(
	localMessages: AiChatMessage[],
	incoming: CollaborationChatMessage[],
): AiChatMessage[] {
	const merged = new Map<string, AiChatMessage>();

	for (const message of localMessages) {
		merged.set(message.id, message);
	}

	for (const message of incoming) {
		merged.set(message.id, fromCollaborationChatMessage(message));
	}

	return [...merged.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}
