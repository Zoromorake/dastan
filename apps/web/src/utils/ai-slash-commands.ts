export interface SlashCommand {
	id: string;
	command: string;
	promptTemplate: string;
}

const STORAGE_KEY = 'dastan.ai-slash-commands.v1';

export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
	{
		id: 'dialogue',
		command: '/dialogue',
		promptTemplate: 'Rewrite the selected dialogue to be sharper and more subtext-driven',
	},
	{
		id: 'notes',
		command: '/notes',
		promptTemplate: "Give me director's notes on this scene",
	},
	{
		id: 'logline',
		command: '/logline',
		promptTemplate: 'Write three logline variations for this screenplay',
	},
	{
		id: 'beat',
		command: '/beat',
		promptTemplate: 'Suggest the next beat based on my current structure',
	},
	{
		id: 'structure',
		command: '/structure',
		promptTemplate:
			'Review my story structure and tell me which beats are missing, weak, or out of order. Reference my workspace structure beats and scenes.',
	},
	{
		id: 'punch',
		command: '/punch',
		promptTemplate: 'Punch up the energy in this scene',
	},
];

const COMMAND_PATTERN = /^\/[a-z][a-z0-9_-]*$/;

export function isValidSlashCommandName(command: string): boolean {
	return COMMAND_PATTERN.test(command.trim().toLowerCase());
}

export function loadSlashCommands(): SlashCommand[] {
	if (typeof window === 'undefined') {
		return DEFAULT_SLASH_COMMANDS;
	}

	const raw = window.localStorage.getItem(STORAGE_KEY);

	if (!raw) {
		return DEFAULT_SLASH_COMMANDS;
	}

	try {
		const parsed = JSON.parse(raw) as SlashCommand[];

		if (!Array.isArray(parsed) || parsed.length === 0) {
			return DEFAULT_SLASH_COMMANDS;
		}

		return parsed;
	} catch {
		return DEFAULT_SLASH_COMMANDS;
	}
}

export function saveSlashCommands(commands: SlashCommand[]): void {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(commands));
}

export function resolveSlashPrompt(
	template: string,
	placeholders: { selection?: string; scene?: string },
): string {
	return template
		.replace(/\{selection\}/g, placeholders.selection ?? '{selection}')
		.replace(/\{scene\}/g, placeholders.scene ?? '{scene}');
}

export function filterSlashCommands(commands: SlashCommand[], query: string): SlashCommand[] {
	const normalized = query.startsWith('/') ? query.slice(1).toLowerCase() : query.toLowerCase();
	return commands.filter(({ command }) => command.slice(1).toLowerCase().startsWith(normalized));
}
