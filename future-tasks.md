# Future tasks

Deferred work tracked from the 7-5-26 hardening pass. Not scheduled — revisit when prioritizing writer-facing credibility or cloud launch.

## True WYSIWYG screenplay pagination

**Deferred indefinitely.** The editor paged view is an approximate preview (decorative page frames + heuristic line counts), not true in-flow pagination. Print/PDF export uses separate layout logic.

When implementing:

- Flow content into real pages per `screenplay-layout.ts` margins
- Apply `(MORE)` / `(CONT'D)` from `dialogueBreaks` / `sceneBreaks` in live pagination and export
- Remove or replace the current overlay-based page view in `ScreenplayEditor.tsx`
- Add visual regression tests for page breaks at dialogue boundaries

## AI context token budgeting

**Partially done; general framework deferred.** Scene-scoped context (current scene, neighbors, rolling digest) is the target. A reusable token-budget framework across all context surfaces is explicitly out of scope for the initial pass.

## CLA legal entity

**Before external contributors:** Replace placeholders in [CLA.md](CLA.md):

- `[JURISDICTION]` — governing law for the Harmony CAA
- Confirm **Us (assignee)** legal entity name for copyright assignment (dual licensing requires a rights holder)

## Git history — black panther PDF

If `black-panther-2018-2.pdf` was ever committed, run `git filter-repo` (or BFG) to purge it before any public push. The file is gitignored at repo root for local manual testing only.

## Production revision — page locking and colored pages

**Deferred.** Pass 2 revision mode v1 uses colored borders and margin asterisks without true pagination. Full colored production pages and A-page / page locking require true WYSIWYG pagination (see above).

## Managed AI provider gating

**Deferred until ai-gateway ships.** BYOK users run editor tools locally without cloud auth today (`chat-handler.ts`). Re-introduce server-side auth/entitlement gating when the managed `dastan-cloud` provider path ships.

## Writing sprints in editor

**Partially done.** Sprint timer and session goals live in `writing-stats.ts`; editor chip wiring can expand in a follow-up.

## First-run onboarding tour

**Partially done.** Sample script seeding and 5-step tour can be expanded with richer beat-board and AI panel steps.

## CI / deploy workflows

Re-enable `.github/workflows/ci.yml` and `deploy-supabase.yml` push triggers when the project is ready for automated gates. `SUPABASE_PROJECT_REF` must be set as a repository secret for deploy.
