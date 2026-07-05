import {
	createAiProviderRegistry,
	createPluginRegistry,
	freeEntitlements,
	type AiProviderAdapter,
	type DastanServices,
} from '@dastan/plugin-api';
import { registerCloudAdapters } from './registerCloudAdapters';
import { builtInAiProviders } from '../services/built-in-ai-providers';
import { localAuthService } from '../services/local-auth';
import { localCollaborationService } from '../services/local-collaboration';
import { localQuotaService } from '../services/local-quota';
import { localShareService } from '../services/local-share';
import { localStorageBackend } from '../services/local-storage-backend';
import { localSyncService } from '../services/local-sync';
import { wrapDevEntitlements } from '../utils/dev-entitlements';

export interface CreateDastanAppOptions {
	cloudUrl?: string;
	extraAiProviders?: AiProviderAdapter[];
}

export function createDastanApp(options: CreateDastanAppOptions = {}): DastanServices {
	const aiProviders = createAiProviderRegistry(builtInAiProviders);

	for (const provider of options.extraAiProviders ?? []) {
		aiProviders.register(provider);
	}

	const plugins = createPluginRegistry();

	return {
		storage: localStorageBackend,
		aiProviders,
		entitlements: wrapDevEntitlements(freeEntitlements),
		share: localShareService,
		sync: localSyncService,
		auth: localAuthService,
		quota: localQuotaService,
		collaboration: localCollaborationService,
		plugins,
	};
}

export async function createDastanAppAsync(options: CreateDastanAppOptions = {}): Promise<DastanServices> {
	const services = createDastanApp(options);
	const withCloud = await registerCloudAdapters(services, {
		cloudUrl: options.cloudUrl ?? import.meta.env.VITE_DASTAN_CLOUD_URL ?? '',
		supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
		supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
	});

	return {
		...withCloud,
		entitlements: wrapDevEntitlements(withCloud.entitlements),
	};
}

export const defaultDastanApp = createDastanApp({
	cloudUrl: import.meta.env.VITE_DASTAN_CLOUD_URL,
});
