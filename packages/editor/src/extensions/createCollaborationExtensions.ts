import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import type { Extensions } from '@tiptap/core';
import type { Awareness } from 'y-protocols/awareness';
import type * as Y from 'yjs';

export interface CollaborationExtensionOptions {
	document: Y.Doc;
	awareness: Awareness;
	user: {
		name: string;
		color: string;
	};
	field?: string;
}

/**
 * TipTap collaboration extensions bound to a shared Yjs document.
 * History must be omitted from the base extension list when these are active.
 */
export function createCollaborationExtensions(options: CollaborationExtensionOptions): Extensions {
	const field = options.field ?? 'default';

	return [
		Collaboration.configure({
			document: options.document,
			field,
		}),
		CollaborationCursor.configure({
			provider: {
				awareness: options.awareness,
			},
			user: options.user,
		}),
	];
}

/**
 * Returns the Y.Map used for live workspace metadata (e.g. script note threads).
 */
export function getCollaborationWorkspaceMap(document: Y.Doc): Y.Map<unknown> {
	return document.getMap('workspace');
}
