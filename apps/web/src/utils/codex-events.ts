/** Notify AI chat / panels that Codex items changed. */
export function notifyCodexChanged(): void {
	window.dispatchEvent(new CustomEvent('dastan:codex-changed'));
}
