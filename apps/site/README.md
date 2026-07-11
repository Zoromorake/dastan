# Dastan site (`@dastan/site`)

Astro landing page at `/` and Starlight documentation at `/docs`.

```bash
# from repo root
npm run site:dev
npm run site:build
```

## Environment variables

Copy `.env.example` → `.env.local` (dev) or `.env.production` (local prod build). These files stay local — see variable list below.

| Variable | Purpose |
|----------|---------|
| `PUBLIC_DASTAN_APP_URL` | Primary CTA link |
| `PUBLIC_DASTAN_REPO_URL` | GitHub link + star count fetch |
| `PUBLIC_DASTAN_DOCS_URL` | Docs path (default `/docs`) |
| `PUBLIC_DASTAN_CONTACT_EMAIL` | Footer contact |

Example `apps/site/.env.production`:

```bash
PUBLIC_DASTAN_APP_URL=https://dastanapp.com
PUBLIC_DASTAN_REPO_URL=https://github.com/Zoromorake/dastan
PUBLIC_DASTAN_DOCS_URL=/docs
PUBLIC_DASTAN_CONTACT_EMAIL=hello@dastanapp.com
```

`PUBLIC_*` vars are **inlined at build time** into static HTML. They must be present when `astro build` runs — not at request time.

App settings use `VITE_DASTAN_DOCS_URL` (in `apps/web`) for the in-app documentation link.

## Cloudflare Pages

1. **Create project** → Connect to Git → branch `main`.
2. **Build settings** (monorepo root):

   | Setting | Value |
   |---------|-------|
   | Framework preset | None |
   | Root directory | `/` (repo root) |
   | Build command | `npm ci && npm run site:build` |
   | Build output directory | `apps/site/dist` |
   | Node.js version | 20+ (Environment → Variables → `NODE_VERSION` = `20`) |

3. **Environment variables** → **Production** (and **Preview** if you want different URLs):

   ```
   PUBLIC_DASTAN_APP_URL=https://dastanapp.com
   PUBLIC_DASTAN_REPO_URL=https://github.com/Zoromorake/dastan
   PUBLIC_DASTAN_DOCS_URL=/docs
   PUBLIC_DASTAN_CONTACT_EMAIL=hello@dastanapp.com
   ```

   Dashboard path: **Workers & Pages → your project → Settings → Environment variables → Production → Add variable**.

4. **Redeploy** after changing vars — Astro bakes them into the build; updating vars alone does not change a past deployment.

### CLI alternative (Wrangler)

If you deploy with Wrangler instead of Git integration:

```bash
npx wrangler pages deploy apps/site/dist --project-name=dastan
```

Set build-time vars in the dashboard (same as above), or export them in your CI job before `npm run site:build`. Wrangler does not read `apps/site/.env.production` from your laptop unless you load it in the build step.

<!-- DECISION: GitHub Pages vs Vercel vs Cloudflare — static output works on any host; Cloudflare chosen for lander. -->

---

© 2026 Arif Qasim and Dastan contributors — set `LEGAL_NAME` in `src/lib/site-config.ts`.
