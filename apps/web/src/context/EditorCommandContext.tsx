import { createContext, useContext, type ReactNode } from 'react';

import type { ScreenplayWorkspaceData } from '../types';

export interface EditorCommands {
	insertAtCursor: (text: string) => void;
	insertScreenplayText: (text: string) => void;
	replaceSelection: (text: string) => void;
	getSelectionText: () => string;
	getCursorBlockType: () => string | null;
	getWorkspace: () => ScreenplayWorkspaceData;
	updateWorkspace: (patch: Partial<ScreenplayWorkspaceData>) => void;
	/** Reverts the script content to how it was immediately before the last insertAtCursor/insertScreenplayText/replaceSelection call. Returns false if there is nothing to undo. */
	undoLastInsert: () => boolean;
}

const EditorCommandContext = createContext<EditorCommands | null>(null);

export function useEditorCommands(): EditorCommands | null {
	return useContext(EditorCommandContext);
}

export function EditorCommandProvider({
	children,
	commands,
}: {
	children: ReactNode;
	commands: EditorCommands;
}) {
	return <EditorCommandContext.Provider value={commands}>{children}</EditorCommandContext.Provider>;
}
