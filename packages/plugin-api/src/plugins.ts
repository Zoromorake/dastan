import type { ComponentType } from 'react';
import type { AiProviderAdapter } from './ai';
import type { ExportFormatContribution } from './contributions';

export interface PluginContext {
	registerAiProvider(provider: AiProviderAdapter): void;
}

export interface DastanPlugin {
	id: string;
	name: string;
	version: string;
	commands?: CommandContribution[];
	panels?: PanelContribution[];
	toolbarItems?: ToolbarContribution[];
	exportFormats?: ExportFormatContribution[];
	aiProviders?: AiProviderAdapter[];
	onActivate?(ctx: PluginContext): void | Promise<void>;
}

export interface CommandContribution {
	id: string;
	label: string;
	shortcut?: string;
	run(): void | Promise<void>;
}

export interface PanelContribution {
	id: string;
	label: string;
	component: ComponentType;
}

export interface ToolbarContribution {
	id: string;
	label: string;
	icon?: ComponentType<{ className?: string }>;
	run(): void | Promise<void>;
}

export interface PluginRegistry {
	register(plugin: DastanPlugin): void;
	list(): DastanPlugin[];
	activateAll(ctx: PluginContext): Promise<void>;
}

export function createPluginRegistry(initialPlugins: DastanPlugin[] = []): PluginRegistry {
	const plugins = new Map<string, DastanPlugin>();

	for (const plugin of initialPlugins) {
		plugins.set(plugin.id, plugin);
	}

	return {
		register(plugin) {
			plugins.set(plugin.id, plugin);
		},
		list() {
			return [...plugins.values()];
		},
		async activateAll(ctx) {
			for (const plugin of plugins.values()) {
				await plugin.onActivate?.(ctx);
				for (const provider of plugin.aiProviders ?? []) {
					ctx.registerAiProvider(provider);
				}
			}
		},
	};
}
