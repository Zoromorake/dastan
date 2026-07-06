# Future tasks

Deferred work tracked from upgrade passes. Not scheduled — revisit when prioritizing writer-facing credibility or cloud launch.

## Astro landing site deploy (Pass 3B)

**Built (Jul 2026).** `apps/site` — Astro landing at `/`, Starlight docs at `/docs`. CI runs `npm run site:build`.

Remaining:

- Manual deploy to GitHub Pages or Vercel (`// DECISION:` in `apps/site/README.md`)
- Replace `<!-- ARIF: ... -->` capture slots on landing (hero video, craft bento, production crop)
- Lighthouse audit on production deploy (local preview Jul 2026: **99** performance, 100 a11y/SEO/BP)
- Set `PUBLIC_*` and `VITE_DASTAN_DOCS_URL` on deployed hosts

## True WYSIWYG screenplay pagination

**Deferred indefinitely.** The editor paged view is an approximate preview (decorative page frames + heuristic line counts), not true in-flow pagination. Print/PDF export uses separate layout logic.

When implementing:

- Flow content into real pages per `screenplay-layout.ts` margins
- Apply `(MORE)` / `(CONT'D)` from `dialogueBreaks` / `sceneBreaks` in live pagination and export
- Remove or replace the current overlay-based page view in `ScreenplayEditor.tsx`
- Add visual regression tests for page breaks at dialogue boundaries

## AI context token budgeting

**Partially done; general framework deferred.** Scene-scoped context (current scene, neighbors, rolling digest) is implemented in `ai-context-script.ts`. A reusable token-budget framework across all context surfaces is explicitly out of scope for the initial pass.

## CLA legal entity

**Before external contributors:** Replace placeholders in [CLA.md](CLA.md):

- `[JURISDICTION]` — governing law for the Harmony CAA
- Confirm **Us (assignee)** legal entity name for copyright assignment (dual licensing requires a rights holder)

## Git history — black panther PDF

If `black-panther-2018-2.pdf` was ever committed, run `git filter-repo` (or BFG) to purge it before any public push. The file is gitignored at repo root for local manual testing only.

## Production revision — page locking and colored pages

**Deferred.** Revision mode uses colored borders and margin asterisks without true pagination. Full colored production pages and page locking require true WYSIWYG pagination (see above).

## Managed AI provider gating

**Deferred until ai-gateway ships.** BYOK users run editor tools locally without cloud auth today (`chat-handler.ts`). Re-introduce server-side auth/entitlement gating when the managed `dastan-cloud` provider path ships.

## Typewriter mode — peer cursor follow

**Partially done (Pass 3).** Center-band scrolling, reduced motion, and manual-scroll suspend are implemented. Dedicated "follow collaborator cursor" UI was **not found** in codebase; typewriter pauses when any collaboration peer is connected. Implement explicit follow mode when collaboration UX ships.

## CI / deploy workflows

Re-enable `.github/workflows/ci.yml` and `deploy-supabase.yml` push triggers when the project is ready for automated gates. `SUPABASE_PROJECT_REF` must be set as a repository secret for deploy. `apps/site` build is in CI (`npm run site:build`).
