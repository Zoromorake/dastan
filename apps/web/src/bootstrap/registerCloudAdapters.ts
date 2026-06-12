import type { DastanServices } from '@dastan/plugin-api';

export interface RegisterCloudAdaptersOptions {
	cloudUrl: string;
}

/**
 * Registers proprietary cloud adapters when dastan-cloud is available.
 *
 * Today this is a scaffold: it validates the URL and leaves local services in place.
 * When the private dastan-cloud package exists, this will dynamically import
 * `@dastan-cloud/bootstrap` and replace auth, sync, share, quota, entitlements,
 * and register the `dastan-cloud` AI provider.
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

	void normalizedUrl;

	return services;
}
