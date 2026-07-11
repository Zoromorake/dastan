import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	DEFAULT_SLASH_COMMANDS,
	isValidSlashCommandName,
	loadSlashCommands,
	saveSlashCommands,
	type SlashCommand,
} from '../../utils/ai-slash-commands';

interface AiSlashCommandsSettingsProps {
	theme: {
		field: string;
		label: string;
		muted: string;
	};
}

export function AiSlashCommandsSettings({ theme }: AiSlashCommandsSettingsProps) {
	const [commands, setCommands] = useState<SlashCommand[]>(() => loadSlashCommands());

	useEffect(() => {
		saveSlashCommands(commands);
		window.dispatchEvent(new CustomEvent('dastan:slash-commands-updated'));
	}, [commands]);

	const move = (index: number, direction: -1 | 1) => {
		setCommands((current) => {
			const next = [...current];
			const target = index + direction;

			if (target < 0 || target >= next.length) {
				return current;
			}

			[next[index], next[target]] = [next[target]!, next[index]!];
			return next;
		});
	};

	return (
		<div className="space-y-3">
			<p className={`text-xs ${theme.muted}`}>
				Templates support {'{selection}'} and {'{scene}'} placeholders resolved at send time.
			</p>
			{commands.map((command, index) => (
				<div key={command.id} className="grid gap-2 rounded-xl border border-border p-3">
					<div className="flex items-center gap-2">
						<input
							className={`flex-1 px-2 py-1.5 text-sm ${theme.field}`}
							value={command.command}
							onChange={(event) => {
								const value = event.target.value;
								setCommands((current) =>
									current.map((entry, entryIndex) =>
										entryIndex === index ? { ...entry, command: value } : entry,
									),
								);
							}}
							onBlur={() => {
								setCommands((current) =>
									current.map((entry, entryIndex) => {
										if (entryIndex !== index) {
											return entry;
										}

										const normalized = entry.command.trim().toLowerCase();
										return {
											...entry,
											command: isValidSlashCommandName(normalized) ? normalized : entry.command,
										};
									}),
								);
							}}
						/>
						<button
							aria-label="Move command up"
							className="rounded border p-1"
							type="button"
							onClick={() => move(index, -1)}
						>
							<ChevronUp size={14} />
						</button>
						<button
							aria-label="Move command down"
							className="rounded border p-1"
							type="button"
							onClick={() => move(index, 1)}
						>
							<ChevronDown size={14} />
						</button>
						<button
							aria-label="Delete command"
							className="rounded border p-1"
							type="button"
							onClick={() => setCommands((current) => current.filter((_, entryIndex) => entryIndex !== index))}
						>
							<Trash2 size={14} />
						</button>
					</div>
					<textarea
						className={`min-h-16 px-2 py-1.5 text-sm ${theme.field}`}
						value={command.promptTemplate}
						onChange={(event) => {
							const value = event.target.value;
							setCommands((current) =>
								current.map((entry, entryIndex) =>
									entryIndex === index ? { ...entry, promptTemplate: value } : entry,
								),
							);
						}}
					/>
				</div>
			))}
			<Button
				type="button"
				variant="outline"
				onClick={() =>
					setCommands((current) => [
						...current,
						{
							id: `custom-${Date.now()}`,
							command: '/new',
							promptTemplate: 'Describe what this command should do…',
						},
					])
				}
			>
				<Plus className="size-4" />
				Add command
			</Button>
			<Button
				type="button"
				variant="ghost"
				onClick={() => setCommands(DEFAULT_SLASH_COMMANDS)}
			>
				Reset to defaults
			</Button>
		</div>
	);
}
