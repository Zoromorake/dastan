/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL?: string;
	readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
	readonly VITE_AI_CHAT_URL?: string;
	readonly VITE_DASTAN_CLOUD_URL?: string;
	readonly VITE_DASTAN_DOCS_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
