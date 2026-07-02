import { createContext, useContext, type ReactNode } from 'react';

export interface EditorCommands {
	insertAtCursor: (text: string) => void;
	insertScreenplayText: (text: string) => void;
	replaceSelection: (text: string) => void;
	getSelectionText: () => string;
	getCursorBlockType: () => string | null;
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
