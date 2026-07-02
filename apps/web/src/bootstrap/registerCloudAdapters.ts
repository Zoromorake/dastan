import type { DastanServices } from '@dastan/plugin-api';

export interface RegisterCloudAdaptersOptions {
	cloudUrl: string;
}

/**
 * STUB — no cloud adapters are registered. Entitlements may still report free-tier
 * prompt quotas, but chat must not treat those as usable until this registers
 * the `dastan-cloud` AI provider in `aiProviders`.
 *
 * Registers proprietary cloud adapters when dastan-cloud is available.
 *
 * Today this is a scaffold: it validates the URL and leaves local services in place.
 * When the private dastan-cloud package exists, this will dynamically import
 * `@dastan-cloud/bootstrap` and replace auth, sync, share, quota, entitlements,
 * collaboration, and register the `dastan-cloud` AI provider.
 */
export async function registerCloudAdapters(
	services: DastanServices,
	cloudUrl?: string,
): Promise<DastanServices> {
	if (!cloudUrl?.trim()) {
		return services;
	}

	const normalizedUrl = cloudUrl.trim().replace(/\/+$/, '');

	if (import.meta.env.DEV) {
		console.info(
			'[dastan] Cloud URL configured but cloud adapters are not installed yet:',
			normalizedUrl,
		);
	}

	// Future:
	// const cloud = await import('@dastan-cloud/bootstrap');
	// return cloud.registerCloudAdapters(services, { cloudUrl: normalizedUrl });
	// Cloud bootstrap replaces: sync, auth, share, quota, entitlements, collaboration.

	void normalizedUrl;

	return services;
}
