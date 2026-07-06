# Dastan site (`@dastan/site`)

Astro landing page at `/` and Starlight documentation at `/docs`.

```bash
# from repo root
npm run site:dev
npm run site:build
```

Environment variables (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `PUBLIC_DASTAN_APP_URL` | Primary CTA link |
| `PUBLIC_DASTAN_REPO_URL` | GitHub link + star count fetch |
| `PUBLIC_DASTAN_DOCS_URL` | Docs path (default `/docs`) |
| `PUBLIC_DASTAN_CONTACT_EMAIL` | Footer contact |

App settings use `VITE_DASTAN_DOCS_URL` for the in-app documentation link.

<!-- DECISION: GitHub Pages vs Vercel — deploy is manual; static output works on either host. -->
