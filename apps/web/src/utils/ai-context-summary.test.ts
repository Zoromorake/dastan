import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import { compressConversationHistory, CONVERSATION_COMPRESS_THRESHOLD } from './ai-context-summary';

function userMessage(text: string): UIMessage {
	return {
		id: crypto.randomUUID(),
		role: 'user',
		parts: [{ type: 'text', text }],
	};
}

describe('compressConversationHistory', () => {
	it('returns messages unchanged below threshold', () => {
		const messages = Array.from({ length: CONVERSATION_COMPRESS_THRESHOLD }, (_, index) =>
			userMessage(`Message ${index}`),
		);

		const result = compressConversationHistory(messages);

		expect(result.systemAppendix).toBeNull();
		expect(result.messages).toHaveLength(messages.length);
	});

	it('compresses older turns and keeps recent verbatim', () => {
		const messages = Array.from({ length: 20 }, (_, index) => userMessage(`Turn ${index}`));

		const result = compressConversationHistory(messages);

		expect(result.systemAppendix).toContain('Earlier conversation');
		expect(result.systemAppendix).toContain('Turn 0');
		expect(result.messages).toHaveLength(8);
		expect(result.messages.at(-1)?.parts?.[0]).toMatchObject({ text: 'Turn 19' });
	});
});
