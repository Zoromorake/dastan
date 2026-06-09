export type SceneHeadingPhase = 'prefix' | 'location' | 'time';

const SCENE_PREFIX_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
	{ pattern: /^(INT|INT\.)$/iu, value: 'INT. ' },
	{ pattern: /^(EXT|EXT\.)$/iu, value: 'EXT. ' },
	{ pattern: /^(INT\.\/EXT|INT\.\/EXT\.|I\/E|INT\/EXT)$/iu, value: 'INT./EXT. ' },
	{ pattern: /^(EXT\.\/INT|EXT\.\/INT\.|E\/I|EXT\/INT)$/iu, value: 'EXT./INT. ' },
];

export function extractScenePrefix(text: string): string | null {
	const match = text.match(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.)\s*/iu);

	if (!match) {
		return null;
	}

	const canonical = match[1].toUpperCase();
	return match[0].endsWith(' ') ? `${canonical} ` : canonical;
}

export function getSceneHeadingPhase(query: string): SceneHeadingPhase {
	if (query.trim().length === 0) {
		return 'prefix';
	}

	const prefix = extractScenePrefix(query);

	if (!prefix) {
		return 'prefix';
	}

	const remainder = query.slice(prefix.length);

	if (/\s-\s*/u.test(remainder)) {
		return 'time';
	}

	return 'location';
}

export function hasStartedSceneHeading(text: string): boolean {
	const trimmed = text.trim();

	if (trimmed.length === 0) {
		return false;
	}

	if (extractScenePrefix(text)) {
		return true;
	}

	return canonicalizeSceneHeadingIntro(trimmed) !== null;
}

export function canonicalizeSceneHeadingIntro(text: string): string | null {
	const trimmed = text.trim();

	if (trimmed.length === 0) {
		return 'INT. ';
	}

	for (const entry of SCENE_PREFIX_PATTERNS) {
		if (entry.pattern.test(trimmed)) {
			return entry.value;
		}
	}

	const prefix = extractScenePrefix(text);

	if (!prefix) {
		return null;
	}

	return prefix.endsWith(' ') ? prefix : `${prefix} `;
}

export type SceneHeadingTabResult =
	| { kind: 'replace'; text: string; cursor: number }
	| { kind: 'action' };

export function advanceSceneHeadingOnTab(text: string): SceneHeadingTabResult {
	const intro = canonicalizeSceneHeadingIntro(text);

	if (!intro) {
		return { kind: 'replace', text: 'INT. ', cursor: 5 };
	}

	const prefix = extractScenePrefix(text) ?? intro;
	const normalizedPrefix = prefix.endsWith(' ') ? prefix : `${prefix} `;
	const remainder = text.slice(prefix.length);

	if (!/\s-\s*/u.test(remainder)) {
		const location = remainder.trimEnd();
		const nextText = location.length > 0 ? `${normalizedPrefix}${location} - ` : normalizedPrefix;
		return { kind: 'replace', text: nextText, cursor: nextText.length };
	}

	const timePart = remainder.split(/\s-\s*/u).slice(1).join(' - ').trim();

	if (timePart.length > 0) {
		return { kind: 'action' };
	}

	const locationPart = remainder.split(/\s-\s*/u)[0]?.trimEnd() ?? '';
	const nextText = `${normalizedPrefix}${locationPart} - `;
	return { kind: 'replace', text: nextText, cursor: nextText.length };
}

export function isSceneHeadingReadyForAction(text: string): boolean {
	const remainder = text.slice((extractScenePrefix(text) ?? '').length);

	if (!/\s-\s*/u.test(remainder)) {
		return false;
	}

	return remainder.split(/\s-\s*/u).slice(1).join(' - ').trim().length > 0;
}
