import type { DastanServices } from '@dastan/plugin-api';

export interface RegisterCloudAdaptersOptions {
	cloudUrl: string;
	supabaseUrl: string;
	supabasePublishableKey: string;
}

/**
 * Registers proprietary cloud adapters when dastan-cloud is available.
 */
export async function registerCloudAdapters(
	services: DastanServices,
	options?: RegisterCloudAdaptersOptions,
): Promise<DastanServices> {
	const cloudUrl = options?.cloudUrl?.trim();
	const supabaseUrl = options?.supabaseUrl?.trim();
	const supabasePublishableKey = options?.supabasePublishableKey?.trim();

	if (!cloudUrl || !supabaseUrl || !supabasePublishableKey) {
		return services;
	}

	try {
		const cloud = await import('@dastan-cloud/bootstrap');
		return cloud.registerCloudAdapters(services, {
			cloudUrl,
			supabaseUrl,
			supabasePublishableKey,
		});
	} catch (error) {
		if (import.meta.env.DEV) {
			console.warn('[dastan] Failed to load cloud adapters:', error);
		}

		return services;
	}
}
