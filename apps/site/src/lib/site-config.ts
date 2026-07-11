const FALLBACK_STARS = 0;

/** Legal name for copyright line — set once here. */
export const LEGAL_NAME = 'Arif Qasim';

/** Show GitHub star count only at or above this threshold. */
export const GITHUB_STARS_THRESHOLD = 5;

export function getSiteConfig() {
	const appUrl = import.meta.env.PUBLIC_DASTAN_APP_URL ?? 'https://dastanapp.com';
	const repoUrl = import.meta.env.PUBLIC_DASTAN_REPO_URL ?? 'https://github.com/Zoromorake/dastan';
	const docsUrl = import.meta.env.PUBLIC_DASTAN_DOCS_URL ?? '/docs';
	const contactEmail = import.meta.env.PUBLIC_DASTAN_CONTACT_EMAIL ?? 'hello@dastanapp.com';

	return { appUrl, repoUrl, docsUrl, contactEmail, legalName: LEGAL_NAME };
}

export function repoBlobUrl(repoUrl: string, filePath: string): string {
	return `${repoUrl.replace(/\/$/u, '')}/blob/main/${filePath}`;
}

export async function fetchGitHubStars(repoUrl: string): Promise<number> {
	const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/u);

	if (!match) {
		return FALLBACK_STARS;
	}

	const repo = match[1].replace(/\.git$/u, '');

	try {
		const response = await fetch(`https://api.github.com/repos/${repo}`, {
			headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'dastan-site-build' },
		});

		if (!response.ok) {
			return FALLBACK_STARS;
		}

		const data = (await response.json()) as { stargazers_count?: number };
		return data.stargazers_count ?? FALLBACK_STARS;
	} catch {
		return FALLBACK_STARS;
	}
}
