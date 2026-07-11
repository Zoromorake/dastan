# Dastan — Hardening, Fixes & UI Pass

You are working in the Dastan monorepo (`apps/web` + `packages/*`, AGPL core, proprietary `cloud/` scaffold). Work through the phases below **in order**. Rules for this entire task:

- Before changing any file, read it and its tests first. Several past "fixes" in this codebase were no-ops (e.g., a CSS class applied with no matching rule) — verify your change actually has an effect end-to-end.
- Run `npm test` and `npm run build` after each phase. Do not proceed to the next phase with failing tests or a broken build.
- Make small, well-scoped commits per fix with descriptive messages (this repo has almost no git history; start building a legible one).
- Do not import anything from `cloud/` into public packages. Cloud code implements `@dastan/plugin-api` interfaces only — never the reverse.
- Do not add new dependencies without stating why in the commit message. Prefer what's already installed.
- If a fix requires a product decision I haven't specified, choose the conservative option and leave a `// DECISION:` comment explaining the alternative.

---

## Phase 0 — Repo hygiene (do first, small and mechanical)

1. **Delete `black-panther-2018-2.pdf` from the repo root.** If it is tracked in git, note in your summary that git history needs purging (`git filter-repo`) before the repo is ever pushed publicly — do not run history rewriting yourself, just flag it. Replace PDF-import test needs with a public-domain screenplay or a generated dummy script placed under a `fixtures/` directory.
2. Remove all committed `.DS_Store` files and add `.DS_Store` to `.gitignore` if not present.
3. Move hardcoded Supabase project refs out of `todo.txt` and any tracked file into `.env.example` placeholders. Verify `supabase/.temp/` and `cloud/supabase/.temp/` are gitignored.
4. Add a root `CONTRIBUTING.md` covering: dev setup, test/build requirements before PRs, the AGPL/cloud boundary rule, and a note that all contributions require signing a CLA (link placeholder). Add basic `.github/ISSUE_TEMPLATE/` bug and feature templates.

## Phase 1 — Trust-critical correctness bugs

1. **FDX character-cue case bug.** `packages/fountain-parser/src/index.ts` — `toFountainScreenplay` re-uppercases character names but `toFinalDraftScreenplay` exports raw `escapeXml(block.text)`. Normalize character cues (and verify transitions/scene headings) to correct case in FDX export. Add a regression test: mixed-case character block → FDX output contains the uppercased cue.
2. **Character cue normalization on split.** `splitToBlockType()` in `packages/editor/src/commands.ts` never calls `normalizeCharacterCue()` — the uppercase display is CSS-only, so stored data can desync from what's on screen. Normalize at the data layer on block creation/split so exports and search operate on canonical text.
3. **Dead pagination CSS.** `ScreenplayEditor.tsx` adds a `screenplay-page-break-before` class (~line 620) that no stylesheet targets. Either implement the rule so paged view renders real in-flow breaks, or remove the class and the paged-view illusion entirely until real pagination ships. Do not leave a decorative fake.
4. **(MORE)/(CONT'D) settings do nothing.** `dialogueBreaks`/`sceneBreaks` exist in WriterInspector but are never applied in pagination or export. Wire them into `screenplay-pagination.ts` and the PDF export path, with tests, OR hide the settings behind a "coming soon" badge. Silent no-op settings are worse than absent ones.
5. **Misleading AI credits UI.** The panel shows "50 Dastan prompts left today" but no `dastan-cloud` provider is registered, so the number is meaningless — every user is BYOK. Hide the credits chip unless a cloud provider is actually registered via the plugin API.
6. **Google provider listed but non-functional.** `AI_PROVIDER_LABELS` includes `google` with zero models in `AI_MODEL_REGISTRY`. Either add Gemini models to the registry (BYOK, using the existing provider adapter pattern) or remove the label until supported.
7. **Automatic version snapshots unused.** `saveVersionSnapshot()` in `packages/local-storage/src/screenplay-storage.ts` is never called. Add automatic snapshots on meaningful boundaries: before any AI insert/replace operation, and on a rolling interval (e.g., every 10 minutes of active editing, keep last N=20 auto-snapshots, prune older). Label them distinctly from manual checkpoints in VersionHistoryDialog.

## Phase 2 — Quick product wins

1. **Runtime estimate.** `runtime-estimate.ts` already exists with tests. Surface "~92 min" (1 page ≈ 1 min) next to page count in: the editor's writing-stats area, and hub script cards. Keep it one small, quiet chip.
2. **Duplicate script / duplicate project.** Add "Duplicate" to both hub action menus (`ScriptActionsMenu`, `ProjectActionsMenu`). Duplicated script gets " (copy)" suffix, fresh id, no shared version history.
3. **Consistent trash semantics.** Scripts get 30-day soft delete; projects/folders currently hard-delete. Give projects the same soft-delete path, or at minimum a typed-confirmation dialog stating child scripts' fate.
4. **Wire hub-level sharing.** `openDocumentShare` exists in `useHubDialogs` but is never attached to hub script cards — sharing is only reachable inside the editor TopBar. Wire it into the hub card action menu.
5. **Delete orphaned code.** Remove `AiContextBar.tsx` and the unused `contextSummary` hook value (superseded by inline chips), and any other components the build never renders. Remove the permanently-disabled attach-file button from the AI input, or hide it until functional.

## Phase 3 — AI foundation (do before adding any new AI features)

1. **Replace the 24k-char hard truncation.** `apps/web/src/utils/ai-context.ts` (`MAX_SCRIPT_CHARS = 24_000`) silently drops the back half of any feature-length script. Implement scene-scoped context: always include (a) the current scene in full, (b) neighboring scenes, (c) a compact structured digest of the rest — scene headings + one-line summaries + character list, built from data the workspace/beat-board already holds. Show the user what the AI can currently "see" (the existing context chips are the right surface). Budget by tokens, not chars, using `ai-context-estimate.ts`.
2. **Give the AI real editor tools.** The chat handler (`packages/ai-providers/src/server/chat-handler.ts`) calls `streamText` with no tools; the only mutation path is raw `insertContent()` of untyped text. Implement 2–3 tools via the AI SDK tool-calling API that operate on **typed screenplay blocks** through `packages/editor` commands: `insert_scene(afterSceneId, blocks[])`, `replace_block(blockId, block)`, `rewrite_selection(blocks[])`. Every AI mutation must: create an automatic version snapshot first (Phase 1.7), render as a reviewable diff/preview the user accepts or rejects — never mutate silently.
3. **Conversation growth.** Long AI threads resend full history each turn. Add rolling summarization past a threshold (summarize older turns into a system note; keep recent N verbatim).

## Phase 4 — UI/UX pass

First **audit, then fix**. Walk every screen (hub, editor, workspace tabs, settings, AI panel, dialogs) and produce `docs/UI-AUDIT.md` listing issues found under the categories below, then fix them. Principles:

- **The script page is sacred.** Courier area must look like a printed screenplay page: correct margins per `screenplay-layout.ts`, no UI chrome bleeding into the page, consistent page-frame shadow/edges in page view. Writers judge the entire product by whether this looks "right."
- **Chrome recedes, writing advances.** Audit visual hierarchy: toolbars, side panels, and chips should be visually quieter than the document. Reduce competing borders/shadows/fills; prefer one accent color used sparingly. Focus mode should hide *everything* nonessential.
- **Consistency sweep.** One spacing scale, one border-radius scale, one icon size per context, consistent dialog anatomy (title/body/actions), consistent button hierarchy (one primary per view). Fix any component that hand-rolls what `packages/ui` primitives provide — migrate it to the shared primitive.
- **States.** Every async surface needs loading (skeletons exist — use them), empty (with a next-step action, not just "nothing here"), and error states. Check: hub with zero scripts, empty trash, AI panel with no key configured, import failure.
- **Keyboard-first.** Verify every documented shortcut works; add visible hint affordances (tooltip shortcuts on toolbar buttons, and the `?` modal already exists — make sure it's discoverable via a small persistent hint for new users).
- **Scene highlight visibility.** The current-scene indicator in SceneNavigator is reportedly near-invisible — make active/hover/selected states clearly distinguishable in both themes.
- **Dark/light theme parity.** Audit both themes for contrast failures (WCAG AA for text) and inconsistent surfaces.
- **Hide inert settings.** `emailNotifications`, `collaboratorMentions`, `newsletter`, `addressBookVisibility` do nothing until cloud ships — remove from UI or badge as "coming soon", consistently with Phase 1.5.
- **Perceived performance.** Split the main 1.24 MB bundle: `React.lazy` the AI panel, PDF import/export (defer `pdfjs-dist` worker until a PDF is actually opened), and split hub vs. editor routes. Target: editor route interactive without loading AI/PDF code.
- Add a one-line security note to the AI keys card: "Keys are stored only in this browser's local storage and sent directly to your provider."

## Phase 5 — Test the experience, not just the logic

1. Add React Testing Library coverage for the highest-risk interactions: Tab/Enter element cycling in the editor, SmartType accept, duplicate/trash/restore flows in the hub, AI insert-with-preview accept/reject.
2. Add one Playwright smoke test: create script → type a scene (heading/action/character/dialogue) → export Fountain → assert output content. Wire it into `.github/workflows/ci.yml`.

## Deliverable

End with a summary listing: every bug fixed (with file references), every UI issue found and its resolution, anything intentionally deferred with reasoning, and remaining `// DECISION:` comments needing my input.
