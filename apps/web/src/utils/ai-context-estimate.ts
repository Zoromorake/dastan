const CHARS_PER_TOKEN = 4;

export function estimateTokensFromChars(charCount: number): number {
	return Math.ceil(charCount / CHARS_PER_TOKEN);
}

export function estimateContextUsagePercent(estimatedTokens: number, maxTokens = 128_000): number {
	return Math.min(100, Math.round((estimatedTokens / maxTokens) * 100));
}

export function formatContextSize(charCount: number): string {
	if (charCount < 1000) {
		return `${charCount} chars`;
	}

	return `${(charCount / 1000).toFixed(1)}k chars`;
}
