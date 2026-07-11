Dastan Evaluation

Verdict up front

Dastan is a genuinely solid local-first screenplay editor with an industry-correct block model (scene heading / action / character / dialogue / parenthetical / transition / shot / etc.), Final-Draft-style Tab/Enter element flow, SmartType autocomplete, Fountain/FDX/PDF import+export, a "Vault" hub with nested project folders, templates, version history with diffs, and a BYOK AI chat panel. The build is clean (npm run build succeeds) and all 52 tests pass across workspaces.

Can a user easily write a movie with it today? Mostly yes for drafting a short/first draft, but no for finishing and delivering a feature. The biggest blockers are: (1) the AI can only chat, never edit the document directly, and it hard-truncates script context at 24,000 characters — a feature-length screenplay (90-120 pages, ~150-200k characters) will not fit, so the AI effectively can't "see" the back half of a real movie; (2) pagination is a cosmetic estimate, not real WYSIWYG page breaks, and (MORE)/(CONT'D) are configurable but never actually inserted, so a script can't be trusted to look production-ready when exported; (3) there is no real collaboration or cloud sync yet (explicitly stubbed), so co-writing — the #1 differentiator of modern tools like WriterDuet, Inkwell, and Slima — doesn't exist.



Primary: what must be improved / added (core "write a movie" journey)

1. AI cannot actually write into the script — only chat

packages/ai-providers/src/server/chat-handler.ts calls streamText with zero tools/function calling. The only way script text changes is the user clicking Insert / Replace Selection in AiChatPanel.tsx, which does a raw editor.insertContent() (plain text, not a properly-typed screenplay block). Compare to 2026 competitors:





Inkwell: "agentic skills" that run a dialogue pass, continuity check, or character-arc runner directly on the script.



Sudowrite: a Story Bible that keeps a 120-page feature consistent and a Write tool that continues the actual scene.



Slima Script Studio: an AI mentor that has read the whole outline/character bible and can act inside the four workflow tabs.

Dastan's assistant is meaningfully behind here. This is the single highest-leverage improvement for "will a user easily be able to write a movie": give the AI actual tools (e.g. insert_scene, rewrite_dialogue_for_character, continuity_check) that operate on typed blocks, not text blobs.

2. Script context hard-truncates at 24,000 characters

apps/web/src/utils/ai-context.ts line 9: MAX_SCRIPT_CHARS = 24_000. A feature screenplay is roughly 100–120 pages ≈ 150,000–200,000 characters. Once a script grows past ~15-20 pages, the AI silently loses the back of the document ("[Script truncated for context window]"). For a tool whose stated purpose is to help write a movie (not a 10-page short), this needs either: a real retrieval strategy (only send the current scene + a rolling synopsis/outline of everything else, which the workspace/beat-board data already half-supports), or a "Story Bible"-style persistent summary a la Sudowrite/Slima that gets updated as the writer progresses, instead of a raw character-count cutoff of full text.

3. Pagination is fake, and MORE/CONT'D settings do nothing

apps/web/src/utils/screenplay-pagination.ts uses a heuristic (55 lines/page, per-block-type char-width tables) to guess page counts, and the "paged" view in ScreenplayEditor.tsx overlays decorative page-sized <div> sheets behind one continuous ProseMirror surface rather than truly flowing content into pages. Confirmed bug: blocks get a screenplay-page-break-before class added (ScreenplayEditor.tsx:620) but no CSS rule anywhere in the codebase targets that class — it's a no-op. dialogueBreaks/sceneBreaks settings exist in WriterInspector (for injecting (MORE)/(CONTINUED)) but are never applied during pagination or export. Since screenwriters live and die by "does this look right when it prints," this is a credibility risk for anyone trying to produce a submission-ready draft.

4. No runtime estimate

Industry rule of thumb is "1 page ≈ 1 minute of screen time." Dastan tracks page count (countPagesFromContent) but never surfaces an estimated runtime anywhere (hub cards, writing stats chip, or editor). This is a nearly-free addition that every produced-writer expects to see.

5. No real collaboration / cloud sync (by design, for now)

freeEntitlements.canUseCloudSync always returns false; registerCloudAdapters.ts is an explicit stub; ShareDialog shows "Cloud sharing coming soon" and folder sharing has no working invite path — only a clipboard link that "works on this device or network until cloud sync is enabled." Writing a movie is very often a two-person job (writing partners, writer + showrunner, writer + notes-giver). Real-time co-editing is the single feature WriterDuet, Inkwell, and Slima all lead with. This is clearly on Dastan's roadmap (plugin-api + private dastan-cloud scaffold already exist) but is not usable today.

6. Outlining/structure tools exist but are shallow relative to competitors

There is a beat board, characters/locations panels, logline/synopsis fields, and a story-structure.test.ts — reasonable bones. But there's no built-in structural framework (Save the Cat / Hero's Journey / three-act templates that map beats to scenes automatically), no AI-assisted "which beat is missing," and no coverage/notes feature (WRITHEON-style "professional coverage in six industry voices" is a whole product category Dastan doesn't touch). Even a lightweight structure-template + AI-coverage pass would materially help someone actually finishing a movie, not just starting one.

7. Templates are thin

Only three: feature, short, TV episode (user-settings.ts). No TV pilot vs. episode distinction, no stage-play/documentary/limited-series options that competitors offer.



Secondary: bugs and UI/UX issues found

Confirmed bugs





Character-cue case can desync between screen and data. Enter is intercepted by useScreenplayPersistence and calls splitToBlockType() (packages/editor/src/commands.ts:10-12), which only splits/re-types the block — it never calls normalizeCharacterCue(). Uppercase display is purely a CSS text-transform. Fountain export re-uppercases (toFountainScreenplay in packages/fountain-parser/src/index.ts:135), but FDX export does not (toFinalDraftScreenplay just does escapeXml(block.text), index.ts:256) — so a Final Draft file exported from Dastan can contain lowercase/mixed-case character names, breaking the one format (FDX) whose entire purpose is fidelity with professional pipelines.



Dead CSS class — screenplay-page-break-before is applied but has no matching rule in apps/web/src/styles/index.css (only .screenplay-page-frame { page-break-after } exists, for print). Paged view likely doesn't render real in-flow breaks.



Automatic version snapshots are unused. saveVersionSnapshot() exists in packages/local-storage/src/screenplay-storage.ts but nothing calls it — only manual "Draft 2"-style checkpoints exist. If a user never manually snapshots, there's no rewind point beyond the single autosaved current state (mitigated somewhat by 2s-debounced continuous autosave, but a bad multi-paragraph AI-insert mistake has no automatic undo checkpoint).



Misleading credits UI. The AI panel shows "50 Dastan prompts left today" (from freeEntitlements.dailyAiPromptsRemaining()), but the dastan-cloud provider that would fulfill those credits is never registered — so the number is currently meaningless; every user must bring their own API key regardless of what the UI implies.



Google provider is listed but non-functional. AI_PROVIDER_LABELS includes google, but AI_MODEL_REGISTRY has zero Google models — selecting it silently does nothing useful (Gemini is only reachable indirectly via OpenRouter).

UI/UX gaps





No "Duplicate" for scripts or projects — a very common expectation ("duplicate as new draft").



Inconsistent delete semantics — scripts get 30-day soft-delete trash; projects/folders delete immediately with no trash/undo.



Share is inconsistent — openDocumentShare is defined in useHubDialogs but never wired to a hub script card; sharing a script is only reachable from inside the editor's TopBar, not from the hub library grid/list where most browsing happens.



Dead/orphaned code — AiContextBar.tsx component and the hook's contextSummary value are built but not rendered anywhere (superseded by inline chips in AiChatInput); worth deleting or wiring up.



Forward-declared settings with no effect — emailNotifications, collaboratorMentions, newsletter, and addressBookVisibility exist in user-settings.ts with no UI or behavior ("will apply when cloud sync ships"). Either hide them until they do something, or clearly badge them as "coming soon" instead of implying they're active.



Attach-file button visible but permanently disabled ("coming soon") — minor clutter in the AI input toolbar.



Large main bundle. Production build shows a 1.24 MB main JS chunk (377 KB gzip) and a 1.3 MB pdf.worker chunk, both above Vite's 500 KB warning threshold. For a writing app where perceived load speed matters (opening a script should feel instant), this is worth addressing via React.lazy / dynamic import() for the AI panel, PDF import/export, and the hub vs. editor route split.



Long AI conversations aren't managed. Full message history is resent on every turn with no summarization; a banner appears at 20 messages but nothing actually prevents context bloat or cost growth.



Third: other observations





Test coverage is utility-only. All 15 test files are .test.ts (pure logic: pagination, fountain parsing, version diff, memory formatting, etc.) — there are no component/interaction tests (no React Testing Library, no Playwright/e2e). For a UI-heavy app with drag/drop, dialogs, and a rich-text editor, regressions in the actual editing experience wouldn't be caught by CI.



Very young project. Only 3 commits in git history and a large in-flight uncommitted diff (AI chat, hub cards, ai-providers) — this is early-stage, single/small-team development, which is useful context for how much to prioritize polish vs. new features right now.



Open-core licensing (AGPL-3.0 + private cloud) is a reasonable model for eventually monetizing collaboration/AI-credits/enterprise, matching the "writing is free" pitch in the README — but note the credits UI (see bug above) already contradicts that promise today.



Security note: BYOK API keys are stored in plaintext localStorage. Reasonable for a local-first BYOK tool, but worth a one-line disclosure in Settings ("keys are stored only in this browser's local storage") — currently only implied in the card description, not a clear security note.



Desktop/mobile are placeholders. The PWA (offline-first) is the only path to "app-like" use outside a desktop browser today.



Suggested prioritization if acting on this





Fix the character-cue case bug (FDX export) — small, high-trust-impact fix.



Wire real page breaks (or remove the dead paged-view illusion until it's real) and add MORE/CONT'D injection.



Add estimated runtime next to page count.



Redesign AI context strategy for full-length scripts (rolling summary / scene-scoped context) before adding more AI features on top of a broken foundation.



Give the AI at least one real "tool" (e.g., insert a properly-typed scene/block, not raw text) to close the gap with Inkwell/Slima-style agentic editing.



Fix the misleading "prompts remaining" UI until dastan-cloud is real, or hide it.



Add duplicate script/project, consistent trash for projects, and wire hub-level sharing.



Address bundle size via code-splitting (AI panel, PDF worker).



Longer-term: real-time collaboration (matches the plugin-api/cloud scaffolding already in place) and AI-assisted structure/coverage tools.

