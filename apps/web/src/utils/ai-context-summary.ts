import type { UIMessage } from 'ai';

/** Message count after which the UI warns the user their conversation is getting long. */
export const LONG_CONVERSATION_MESSAGE_THRESHOLD = 12;

/** Start compressing history once this many messages exist. */
export const CONVERSATION_COMPRESS_THRESHOLD = 14;

/** Recent turns kept verbatim when compressing. */
export const CONVERSATION_KEEP_RECENT = 8;

const MAX_SUMMARY_CHARS = 3_000;

function getMessageText(message: UIMessage): string {
	if (!message.parts?.length) {
		return '';
	}

	return message.parts
		.filter((part) => part.type === 'text')
		.map((part) => ('text' in part ? String(part.text) : ''))
		.join('\n')
		.trim();
}

function summarizeOlderMessages(messages: UIMessage[]): string {
	const lines: string[] = [];

	for (const message of messages) {
		const text = getMessageText(message);

		if (!text) {
			continue;
		}

		const role = message.role === 'user' ? 'Writer' : 'Assistant';
		const clipped = text.length > 280 ? `${text.slice(0, 277)}…` : text;
		lines.push(`- ${role}: ${clipped.replace(/\s+/gu, ' ')}`);
	}

	if (lines.length === 0) {
		return '';
	}

	const combined = `Earlier conversation (compressed):\n${lines.join('\n')}`;

	if (combined.length <= MAX_SUMMARY_CHARS) {
		return combined;
	}

	return `${combined.slice(0, MAX_SUMMARY_CHARS)}\n…`;
}

export interface CompressedConversation {
	systemAppendix: string | null;
	messages: UIMessage[];
}

/** Drop oldest turns into a text summary; keep recent messages verbatim. */
export function compressConversationHistory(messages: UIMessage[]): CompressedConversation {
	if (messages.length <= CONVERSATION_COMPRESS_THRESHOLD) {
		return { systemAppendix: null, messages };
	}

	const older = messages.slice(0, -CONVERSATION_KEEP_RECENT);
	const recent = messages.slice(-CONVERSATION_KEEP_RECENT);
	const summary = summarizeOlderMessages(older);

	return {
		systemAppendix: summary || null,
		messages: recent,
	};
}
