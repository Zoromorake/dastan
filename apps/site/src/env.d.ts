/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_DASTAN_APP_URL: string;
	readonly PUBLIC_DASTAN_REPO_URL: string;
	readonly PUBLIC_DASTAN_DOCS_URL: string;
	readonly PUBLIC_DASTAN_CONTACT_EMAIL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
