import { describe, expect, it } from 'vitest';
import { fromCollaborationChatMessage, mergeCollaborationChatMessages, toCollaborationChatMessage } from './collaboration-chat';

describe('collaboration-chat', () => {
	it('round-trips collaboration chat messages', () => {
		const local = {
			id: 'm1',
			role: 'user' as const,
			content: 'Hello room',
			createdAt: '2026-06-30T00:00:00.000Z',
		};

		const wire = toCollaborationChatMessage('thread-1', local, 'user-1');
		expect(wire.threadId).toBe('thread-1');
		expect(wire.senderUserId).toBe('user-1');

		const restored = fromCollaborationChatMessage(wire);
		expect(restored).toEqual(local);
	});

	it('merges local and broadcast messages without duplicates', () => {
		const local = [
			{
				id: 'm1',
				role: 'user' as const,
				content: 'First',
				createdAt: '2026-06-30T00:00:00.000Z',
			},
		];

		const incoming = [
			{
				id: 'm1',
				threadId: 'thread-1',
				role: 'user' as const,
				content: 'First duplicate',
				createdAt: '2026-06-30T00:00:00.000Z',
			},
			{
				id: 'm2',
				threadId: 'thread-1',
				role: 'assistant' as const,
				content: 'Reply',
				createdAt: '2026-06-30T00:00:01.000Z',
			},
		];

		const merged = mergeCollaborationChatMessages(local, incoming);
		expect(merged).toHaveLength(2);
		expect(merged[0]?.id).toBe('m1');
		expect(merged[1]?.id).toBe('m2');
	});
});
