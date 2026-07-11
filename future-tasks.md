# Future tasks

Deferred work tracked from upgrade passes. Not scheduled — revisit when prioritizing writer-facing credibility or cloud launch.

## Astro landing site deploy (Pass 3B)

**Built (Jul 2026).** `apps/site` — Astro landing at `/`, Starlight docs at `/docs`. CI runs `npm run site:build`.

Remaining:

- Replace remaining `<!-- ARIF: ... -->` capture slots with real screenshots (hero video `public/hero-demo.webm`, craft bento, production crop) — placeholder cards ship in Pass 4. Needs recorded product captures (not code).

## True WYSIWYG screenplay pagination

**Deferred indefinitely.** The editor paged view is an approximate preview (decorative page frames + heuristic line counts), not true in-flow pagination. Print/PDF export uses separate layout logic.

When implementing:

- Flow content into real pages per `screenplay-layout.ts` margins
- Apply `(MORE)` / `(CONT'D)` from `dialogueBreaks` / `sceneBreaks` in live pagination and export
- Remove or replace the current overlay-based page view in `ScreenplayEditor.tsx`
- Add visual regression tests for page breaks at dialogue boundaries

## AI context token budgeting

**Partially done; general framework deferred.** Scene-scoped context (current scene, neighbors, rolling digest) is implemented in `ai-context-script.ts`. A reusable token-budget framework across all context surfaces is explicitly out of scope for the initial pass.

## Production revision — page locking and colored pages

**Deferred.** Revision mode uses colored borders and margin asterisks without true pagination. Full colored production pages and page locking require true WYSIWYG pagination (see above).

## Managed AI provider gating

**Deferred until ai-gateway ships.** BYOK users run editor tools locally without cloud auth today (`chat-handler.ts`). Re-introduce server-side auth/entitlement gating when the managed `dastan-cloud` provider path ships.

## Typewriter mode — peer cursor follow

**Partially done (Pass 3).** Center-band scrolling, reduced motion, and manual-scroll suspend are implemented. Dedicated "follow collaborator cursor" UI was **not found** in codebase; typewriter pauses when any collaboration peer is connected. Implement explicit follow mode when collaboration UX ships.

## CI / deploy workflows

CI push triggers on `main` are already enabled (`.github/workflows/ci.yml`).

Still deferred:

- Re-enable `.github/workflows/deploy-supabase.yml` push triggers when ready for automated function deploys. `SUPABASE_PROJECT_REF` + `SUPABASE_ACCESS_TOKEN` must be set as repository secrets. Job is currently `workflow_dispatch` + `if: false`.

## Pass 6 — AI Panel Overhaul (Jul 2026)

**Shipped (Phases 1–6 core + follow-ups).** Mode/model dropdown toolbar, context meter + inspector, slash commands, rules/memory drawers, tool review cards, streaming tool activity line, ScreenplayBlock Courier rendering in AI replies with Insert → preview-accept.

**Shipped follow-ups:**

- Streaming tool activity — live `running`/`preview` cards, activity label, Stop/Esc → skipped, stable `toolCallId`s
- ScreenplayBlock in AI replies — fenced + heuristic segmentation, chat-scaled Courier layout, chunk Insert via `planner_insert` preview (Ask/Planner/Editor in editor panel)

## Pass 5 — Web app UX (Phases 1–6, Jul 2026)

**Shipped.** Lapis/gold palette, dark page glow, khatam, etymology, slate-first hub, Today panel, Development Room guide, ephemeral drafts + 48h sweep, untitled dedupe, Cmd/Ctrl+K palette, FADE OUT celebration.

**Shipped follow-up:** Automated WCAG token contrast checks in `theme-contrast.test.ts` (light/dark body, card, paper, muted, primary button pairs).

Deferred:

- **Ephemeral tradeoff** — New scratch/guide scripts stay in memory until first meaningful touch; navigating away discards untouched blanks (sessionStorage backup + draft banner mitigate; full create-path refactor still avoided)
