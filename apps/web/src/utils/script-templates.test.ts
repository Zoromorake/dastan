import { describe, expect, it } from 'vitest';
import { SCRIPT_TEMPLATE_DESCRIPTIONS, SCRIPT_TEMPLATE_STRUCTURE } from './script-templates';
import { SCRIPT_TEMPLATE_LABELS } from './user-settings';

describe('script-templates', () => {
	it('defines labels and structure pairings for every template', () => {
		for (const template of Object.keys(SCRIPT_TEMPLATE_LABELS) as Array<keyof typeof SCRIPT_TEMPLATE_LABELS>) {
			expect(SCRIPT_TEMPLATE_DESCRIPTIONS[template]).toBeTruthy();
			expect(SCRIPT_TEMPLATE_STRUCTURE[template]).toBeTruthy();
		}
	});
});
