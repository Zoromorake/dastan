import { useEffect } from 'react';
import type { UIMessage } from 'ai';
import { useDastanApp } from '../context/DastanAppProvider';
import { fromCollaborationChatMessage } from '../utils/collaboration-chat';

interface UseCollaborationChatSyncOptions {
	roomId: string | null;
	threadId: string | null;
	setMessages: (messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])) => void;
}

/**
 * Subscribes to shared AI chat messages broadcast over the collaboration room.
 * When cloud collaboration is unavailable, this hook is a no-op.
 */
export function useCollaborationChatSync({
	roomId,
	threadId,
	setMessages,
}: UseCollaborationChatSyncOptions): void {
	const { collaboration } = useDastanApp();

	useEffect(() => {
		if (!collaboration.isAvailable() || !roomId || !threadId) {
			return;
		}

		const room = collaboration.openRoom(roomId);

		return room.subscribeChatMessages((message) => {
			if (message.threadId !== threadId) {
				return;
			}

			const stored = fromCollaborationChatMessage(message);

			setMessages((current) => {
				if (current.some((entry) => entry.id === stored.id)) {
					return current;
				}

				return [
					...current,
					{
						id: stored.id,
						role: stored.role,
						parts: [{ type: 'text', text: stored.content }],
					},
				];
			});
		});
	}, [collaboration, roomId, setMessages, threadId]);
}
