import type { AiProviderRegistry } from './ai';
import type { AuthService } from './auth';
import type { Entitlements } from './entitlements';
import type { PluginRegistry } from './plugins';
import type { QuotaService } from './quota';
import type { ShareService } from './share';
import type { StorageBackend } from './storage';
import type { SyncService } from './sync';

export interface DastanServices {
	storage: StorageBackend;
	aiProviders: AiProviderRegistry;
	entitlements: Entitlements;
	share: ShareService;
	sync: SyncService;
	auth: AuthService;
	quota: QuotaService;
	plugins: PluginRegistry;
}

export * from './ai';
export * from './auth';
export * from './contributions';
export * from './entitlements';
export * from './plugins';
export * from './quota';
export * from './share';
export * from './storage';
export * from './sync';
