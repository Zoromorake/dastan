import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SLASH_COMMANDS,
	filterSlashCommands,
	isValidSlashCommandName,
	resolveSlashPrompt,
} from './ai-slash-commands';

describe('ai-slash-commands', () => {
	it('validates slash command names', () => {
		expect(isValidSlashCommandName('/dialogue')).toBe(true);
		expect(isValidSlashCommandName('dialogue')).toBe(false);
		expect(isValidSlashCommandName('/bad name')).toBe(false);
	});

	it('filters commands by prefix', () => {
		const matches = filterSlashCommands(DEFAULT_SLASH_COMMANDS, '/dia');
		expect(matches.some((command) => command.command === '/dialogue')).toBe(true);
	});

	it('resolves placeholders', () => {
		const text = resolveSlashPrompt('Rewrite {selection} in {scene}', {
			selection: 'Hello',
			scene: 'INT. KITCHEN',
		});
		expect(text).toContain('Hello');
		expect(text).toContain('INT. KITCHEN');
	});
});
