/** Granular toggles supported by buildSmartScriptContext — active scene is always on when script context is enabled. */
export interface ScriptContextSections {
	neighboringScenes: boolean;
	sceneOutline: boolean;
	rollingSummary: boolean;
	otherSceneExcerpts: boolean;
	/** Large scripts only — opening excerpt when over budget */
	scriptOpening: boolean;
	/** Large scripts only — ending excerpt when over budget */
	scriptEnding: boolean;
}

export function defaultScriptContextSections(): ScriptContextSections {
	return {
		neighboringScenes: true,
		sceneOutline: true,
		rollingSummary: true,
		otherSceneExcerpts: true,
		scriptOpening: true,
		scriptEnding: true,
	};
}
