/** Normalize a character cue to industry-standard uppercase with extension formatting. */
export function normalizeCharacterCue(rawText: string): string {
	let next = rawText.trim().replace(/\s+/gu, ' ').toUpperCase();

	next = next
		.replace(/\(\s*V\.?\s*O\.?\s*\)/giu, '(V.O.)')
		.replace(/\(\s*O\.?\s*S\.?\s*\)/giu, '(O.S.)')
		.replace(/\(\s*CONT['']?D\s*\)/giu, "(CONT'D)")
		.replace(/\s*\(\s*/gu, ' (')
		.replace(/\s*\)\s*/gu, ')')
		.replace(/\s+/gu, ' ')
		.trim();

	return next;
}
