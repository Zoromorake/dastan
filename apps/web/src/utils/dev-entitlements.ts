import type { Entitlements } from '@dastan/plugin-api';
import { isDevEditorAiEnabled } from './dev-editor-ai';

/** In dev, unlock Editor AI for local testing regardless of cloud role. */
export function wrapDevEntitlements(entitlements: Entitlements): Entitlements {
	if (!isDevEditorAiEnabled()) {
		return entitlements;
	}

	return {
		...entitlements,
		canUseEditorAi: () => true,
	};
}
