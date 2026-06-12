export type SharePermission = 'view' | 'comment' | 'edit';

export interface SharedScriptEntry {
	documentId: string;
	title: string;
	sharedAt: string;
	contactIds: string[];
	permission: SharePermission;
	note?: string;
}

const STORAGE_KEY = 'dastan.shared-library.v1';

export function getSharedScripts(): SharedScriptEntry[] {
	if (typeof window === 'undefined') {
		return [];
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);

		if (!raw) {
			return [];
		}

		const parsed = JSON.parse(raw) as SharedScriptEntry[];

		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter(
			(entry) =>
				typeof entry?.documentId === 'string' &&
				typeof entry?.title === 'string' &&
				typeof entry?.sharedAt === 'string' &&
				Array.isArray(entry.contactIds),
		);
	} catch {
		return [];
	}
}

function saveSharedScripts(entries: SharedScriptEntry[]): void {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function recordSharedScript(input: {
	documentId: string;
	title: string;
	contactIds: string[];
	permission: SharePermission;
	note?: string;
}): SharedScriptEntry {
	const trimmedNote = input.note?.trim();
	const nextEntry: SharedScriptEntry = {
		documentId: input.documentId,
		title: input.title.trim() || 'Untitled',
		sharedAt: new Date().toISOString(),
		contactIds: [...new Set(input.contactIds)],
		permission: input.permission,
		note: trimmedNote && trimmedNote.length > 0 ? trimmedNote : undefined,
	};

	const existing = getSharedScripts().filter((entry) => entry.documentId !== input.documentId);
	saveSharedScripts([nextEntry, ...existing]);

	return nextEntry;
}

export function removeSharedScript(documentId: string): SharedScriptEntry[] {
	const next = getSharedScripts().filter((entry) => entry.documentId !== documentId);
	saveSharedScripts(next);
	return next;
}

export function buildShareInviteText(options: {
	title: string;
	shareLink: string;
	recipientNames: string[];
	permission: SharePermission;
	note?: string;
}): string {
	const names = options.recipientNames.join(', ');
	const noteLine = options.note?.trim() ? `\n\nNote: ${options.note.trim()}` : '';

	return `You're invited to review "${options.title}" on Dastan.\n\nOpen: ${options.shareLink}\nPermission: ${options.permission}\nRecipients: ${names}${noteLine}\n\nThis link works on this device or network until cloud sync is enabled.`;
}
