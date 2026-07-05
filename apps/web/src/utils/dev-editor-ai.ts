/** True in Vite dev builds — enables Editor (agentic) AI without cloud sign-in. */
export function isDevEditorAiEnabled(): boolean {
	return import.meta.env.DEV;
}
