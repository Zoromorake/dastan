import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface TextMatch {
	from: number;
	to: number;
}

export function findTextMatches(doc: ProseMirrorNode, query: string, caseSensitive = false): TextMatch[] {
	const trimmed = query.trim();

	if (trimmed.length === 0) {
		return [];
	}

	const searchQuery = caseSensitive ? trimmed : trimmed.toLowerCase();
	const matches: TextMatch[] = [];

	doc.descendants((node, pos) => {
		if (!node.isText || !node.text) {
			return;
		}

		const text = caseSensitive ? node.text : node.text.toLowerCase();
		let startIndex = 0;

		while (startIndex < text.length) {
			const found = text.indexOf(searchQuery, startIndex);

			if (found === -1) {
				break;
			}

			matches.push({
				from: pos + found,
				to: pos + found + trimmed.length,
			});

			startIndex = found + Math.max(1, trimmed.length);
		}
	});

	return matches;
}

export function selectMatch(editor: Editor, match: TextMatch): void {
	editor.chain().focus().setTextSelection({ from: match.from, to: match.to }).scrollIntoView().run();
}

export function replaceMatch(editor: Editor, match: TextMatch, replacement: string): void {
	const { state, view } = editor;
	const transaction = state.tr.insertText(replacement, match.from, match.to);
	view.dispatch(transaction);
}

export function replaceAllMatches(
	editor: Editor,
	query: string,
	replacement: string,
	caseSensitive = false,
): number {
	const matches = findTextMatches(editor.state.doc, query, caseSensitive);

	if (matches.length === 0) {
		return 0;
	}

	let transaction = editor.state.tr;

	for (let index = matches.length - 1; index >= 0; index -= 1) {
		const match = matches[index];
		transaction = transaction.insertText(replacement, match.from, match.to);
	}

	editor.view.dispatch(transaction);
	editor.commands.focus();

	return matches.length;
}
