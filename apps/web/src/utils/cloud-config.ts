export interface CloudConfig {
	cloudUrl: string;
	supabaseUrl: string;
	supabasePublishableKey: string;
}

export function getCloudConfig(): CloudConfig {
	return {
		cloudUrl: import.meta.env.VITE_DASTAN_CLOUD_URL?.trim() ?? '',
		supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
		supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
	};
}

export function isCloudConfigured(config: CloudConfig = getCloudConfig()): boolean {
	return Boolean(config.cloudUrl && config.supabaseUrl && config.supabasePublishableKey);
}
