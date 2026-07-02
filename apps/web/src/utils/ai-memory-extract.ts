const MAX_SUGGESTION_LENGTH = 120;
const MAX_SUGGESTIONS = 3;

function normalizeWhitespace(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

function truncateSuggestion(text: string): string {
	const normalized = normalizeWhitespace(text);

	if (normalized.length <= MAX_SUGGESTION_LENGTH) {
		return normalized;
	}

	return `${normalized.slice(0, MAX_SUGGESTION_LENGTH - 1).trim()}…`;
}

function addSuggestion(suggestions: string[], raw: string | undefined): void {
	if (!raw) {
		return;
	}

	const distilled = truncateSuggestion(raw);

	if (distilled.length < 12) {
		return;
	}

	const duplicate = suggestions.some((existing) => existing.toLowerCase() === distilled.toLowerCase());

	if (!duplicate) {
		suggestions.push(distilled);
	}
}

const EXPLICIT_INTENT_PATTERNS = [
	/(?:I'll remember|I will remember|I'll keep in mind|I'?ll note that|Noted:|Got it —|Got it -|Got it:)\s*(.+)/i,
];

const PREFERENCE_PATTERNS = [
	/(?:you mentioned|you prefer|you prefer to|your protagonist|your style|you like to write|you tend to)[^.!?\n]{10,}/i,
];

const STORY_FACT_PATTERNS = [
	/(?:logline|central theme|main theme|theme of the story|act (?:one|two|three|i|ii|iii|1|2|3))[^.!?\n:]{0,20}[:—-]\s*(.+)/i,
	/(?:the story (?:is about|follows|centers on)|this screenplay (?:is about|follows))[^.!?\n]{10,}/i,
	/(?:three-act structure|story structure|structural weakness)[^.!?\n]{10,}/i,
];

const CHARACTER_BIO_HINTS =
	/\b(?:age|years old|protagonist|antagonist|brother|sister|father|mother|wife|husband|son|daughter|relationship|motivation|arc|backstory|works as|job as)\b/i;

const CHARACTER_NAME_PATTERN = /\b([A-Z][A-Z0-9' -]{1,24}[A-Z0-9])\b/g;

function extractFromExplicitIntent(text: string, suggestions: string[]): void {
	for (const line of text.split('\n')) {
		for (const pattern of EXPLICIT_INTENT_PATTERNS) {
			const match = line.match(pattern);

			if (match?.[1]) {
				addSuggestion(suggestions, match[1]);
			}
		}
	}
}

function extractFromPreferences(text: string, suggestions: string[]): void {
	for (const sentence of text.split(/(?<=[.!?])\s+/)) {
		for (const pattern of PREFERENCE_PATTERNS) {
			const match = sentence.match(pattern);

			if (match?.[0]) {
				addSuggestion(suggestions, match[0]);
			}
		}
	}
}

function extractFromStoryFacts(text: string, suggestions: string[]): void {
	for (const sentence of text.split(/(?<=[.!?])\s+/)) {
		for (const pattern of STORY_FACT_PATTERNS) {
			const match = sentence.match(pattern);

			if (match) {
				addSuggestion(suggestions, match[1] ?? match[0]);
			}
		}
	}
}

function extractFromCharacterFacts(text: string, suggestions: string[]): void {
	for (const line of text.split('\n')) {
		if (!CHARACTER_BIO_HINTS.test(line)) {
			continue;
		}

		const names = [...line.matchAll(CHARACTER_NAME_PATTERN)]
			.map((match) => match[1].trim())
			.filter((name) => name.length >= 2 && name !== 'INT' && name !== 'EXT' && name !== 'DAY' && name !== 'NIGHT');

		if (names.length === 0) {
			continue;
		}

		const primaryName = names[0];
		const detail = normalizeWhitespace(line.replace(primaryName, primaryName).slice(0, 200));
		addSuggestion(suggestions, detail);
	}
}

export function extractMemorySuggestions(assistantText: string): string[] {
	if (!assistantText.trim()) {
		return [];
	}

	const suggestions: string[] = [];

	extractFromExplicitIntent(assistantText, suggestions);
	extractFromPreferences(assistantText, suggestions);
	extractFromStoryFacts(assistantText, suggestions);
	extractFromCharacterFacts(assistantText, suggestions);

	return suggestions.slice(0, MAX_SUGGESTIONS);
}
