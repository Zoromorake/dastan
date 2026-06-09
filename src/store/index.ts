import type { JSONContent } from '@tiptap/core';
import { create } from 'zustand';

import { normalizeDocumentLayout } from '../utils/screenplay-layout';
import { normalizeWorkspaceData } from '../types';
import type { ScreenplayDocumentLayout, ScreenplayDocumentRecord, ScreenplaySaveStatus, ScreenplayWorkspaceData } from '../types';

export interface ScreenplayStoreState {
	currentDocument: ScreenplayDocumentRecord | null;
	documentList: ScreenplayDocumentRecord[];
	isHydrated: boolean;
	saveStatus: ScreenplaySaveStatus;
	focusMode: boolean;
	setCurrentDocument: (document: ScreenplayDocumentRecord) => void;
	setDocumentList: (documents: ScreenplayDocumentRecord[]) => void;
	switchDocument: (id: string) => void;
	setDocumentContent: (content: JSONContent) => void;
	setDocumentTitle: (title: string) => void;
	setDocumentLayout: (layout: Partial<ScreenplayDocumentLayout>) => void;
	setDocumentWorkspace: (workspace: Partial<ScreenplayWorkspaceData>) => void;
	setFocusMode: (focusMode: boolean) => void;
	setHydrated: (isHydrated: boolean) => void;
	setSaveStatus: (saveStatus: ScreenplaySaveStatus) => void;
}

export const useScreenplayStore = create<ScreenplayStoreState>((set) => ({
	currentDocument: null,
	documentList: [],
	isHydrated: false,
	saveStatus: 'saved',
	focusMode: false,
	setCurrentDocument: (currentDocument) => {
		set({ currentDocument });
	},
	setDocumentList: (documentList) => {
		set({ documentList });
	},
	switchDocument: (id) => {
		set((state) => {
			const nextDocument = state.documentList.find((document) => document.id === id);

			if (!nextDocument) {
				return {};
			}

			return {
				currentDocument: nextDocument,
			};
		});
	},
	setDocumentContent: (content) => {
		set((state) => {
			if (state.currentDocument === null) {
				return {};
			}

			return {
				currentDocument: {
					...state.currentDocument,
					content,
				},
			};
		});
	},
	setDocumentTitle: (title) => {
		set((state) => {
			if (state.currentDocument === null) {
				return {};
			}

			return {
				currentDocument: {
					...state.currentDocument,
					title,
				},
			};
		});
	},
	setDocumentLayout: (layout) => {
		set((state) => {
			if (state.currentDocument === null) {
				return {};
			}

			const currentLayout = normalizeDocumentLayout(state.currentDocument.layout);

			return {
				currentDocument: {
					...state.currentDocument,
					layout: normalizeDocumentLayout({
						...currentLayout,
						...layout,
						titlePage: {
							...currentLayout.titlePage,
							...layout.titlePage,
						},
						pageMargins: {
							...currentLayout.pageMargins,
							...layout.pageMargins,
						},
						headerFooterMargins: {
							...currentLayout.headerFooterMargins,
							...layout.headerFooterMargins,
						},
						headerFooter: {
							...currentLayout.headerFooter,
							...layout.headerFooter,
						},
						pageAppearance: {
							...currentLayout.pageAppearance,
							...layout.pageAppearance,
						},
						dialogueBreaks: {
							...currentLayout.dialogueBreaks,
							...layout.dialogueBreaks,
						},
						sceneBreaks: {
							...currentLayout.sceneBreaks,
							...layout.sceneBreaks,
						},
					}),
				},
			};
		});
	},
	setDocumentWorkspace: (workspace) => {
		set((state) => {
			if (state.currentDocument === null) {
				return {};
			}

			const currentWorkspace = normalizeWorkspaceData(state.currentDocument.workspace);

			return {
				currentDocument: {
					...state.currentDocument,
					workspace: normalizeWorkspaceData({
						...currentWorkspace,
						...workspace,
						sceneNotes: {
							...currentWorkspace.sceneNotes,
							...workspace.sceneNotes,
						},
						characterProfiles: {
							...currentWorkspace.characterProfiles,
							...workspace.characterProfiles,
						},
						locationProfiles: {
							...currentWorkspace.locationProfiles,
							...workspace.locationProfiles,
						},
					}),
				},
			};
		});
	},
	setFocusMode: (focusMode) => {
		set({ focusMode });
	},
	setHydrated: (isHydrated) => {
		set({ isHydrated });
	},
	setSaveStatus: (saveStatus) => {
		set({ saveStatus });
	},
}));
