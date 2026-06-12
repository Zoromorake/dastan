export type WorkspaceMode = 'develop' | 'script' | 'world';

export type DevelopSubTab = 'basics' | 'structure' | 'beats' | 'outline' | 'treatment';

export type WorldSubTab = 'characters' | 'locations' | 'notes';

export type WorkspacePanelTab = DevelopSubTab | WorldSubTab;

export const DEVELOP_SUB_TABS: Array<{ id: DevelopSubTab; label: string }> = [
	{ id: 'basics', label: 'Basics' },
	{ id: 'structure', label: 'Structure' },
	{ id: 'beats', label: 'Beats' },
	{ id: 'outline', label: 'Outline' },
	{ id: 'treatment', label: 'Treatment' },
];

export const WORLD_SUB_TABS: Array<{ id: WorldSubTab; label: string }> = [
	{ id: 'characters', label: 'Characters' },
	{ id: 'locations', label: 'Locations' },
	{ id: 'notes', label: 'Notes' },
];
