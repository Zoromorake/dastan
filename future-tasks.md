# Future tasks

Deferred work tracked from upgrade passes. Not scheduled — revisit when prioritizing writer-facing credibility or cloud launch.

## Astro landing site deploy (Pass 3B)

**Built (Jul 2026).** `apps/site` — Astro landing at `/`, Starlight docs at `/docs`. CI runs `npm run site:build`.

Remaining:

- Replace remaining `<!-- ARIF: ... -->` capture slots with real screenshots (hero video `public/hero-demo.webm`, craft bento, production crop) — placeholder cards ship in Pass 4

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

Re-enable `.github/workflows/ci.yml` and `deploy-supabase.yml` push triggers when the project is ready for automated gates. `SUPABASE_PROJECT_REF` must be set as a repository secret for deploy. `apps/site` build is in CI (`npm run site:build`).

## Pass 6 — AI Panel Overhaul (Jul 2026)

**Shipped (Phases 1–6 core + deferred follow-ups).** Mode/model dropdown toolbar, context meter + inspector with script-section toggles (including opening/ending), per-document prefs, slash commands in settings, rules drawer, memory drawer with suggested review, settings AI sections with deep links, batch + inline tool review cards, library/script history separator, per-script model overflow action, keyword-ranked approved memories in context, Cmd/Ctrl+. mode cycle, Cmd/Ctrl+L focus input, Esc stops streaming.

Still deferred:

- **ScreenplayBlock rendering in AI replies** — Courier insert-via-preview flow not built; plain markdown + insert actions remain
- **Streaming tool activity line** — inline cards appear after completion; live per-tool status during stream not built

## Pass 5 — Web app UX (Phases 1–6, Jul 2026)

**Shipped.** Lapis/gold palette, dark page glow, khatam (hub divider + empty mark only), etymology in settings, slate-first hub with poster cards (including upload), Today panel with deterministic briefing + optional AI line, Development Room guide, ephemeral-until-touched drafts with 48h sweep, untitled dedupe, Cmd/Ctrl+K palette (hub + editor), FADE OUT celebration. Removed dead `HubScriptsPanel` / `ScriptCard`.

Deferred:

- **Automated WCAG token audit** — Token pairs tuned manually; add scripted contrast check in CI if palette changes often
- **Ephemeral tradeoff** — New scratch/guide scripts stay in memory until first meaningful touch; navigating away discards untouched blanks silently (logged here because full create-path refactor was avoided)
