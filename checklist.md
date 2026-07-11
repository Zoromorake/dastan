# Dastan — manual QA checklist

Use this when smoke-testing the app, docs, and site after a change. Check items off as you go. Notes column is for bugs, screenshots, or “works / broken”.

**Run locally**

```bash
npm install
npm run dev          # app → http://localhost:5173
npm run site:dev     # landing + docs → http://localhost:4321
```

---

## Marketing site & docs

| Done | Item | Notes |
|:----:|------|-------|
| x | Landing loads at `/` — hero headline, CTAs, all sections scroll | |
| ☐ | Hero editor island — Tab cycles elements, Enter advances, sluglines uppercase | |
| ☐ | Mobile hero — video placeholder shows (no broken island) | |
| ☐ | Craft bento links open the right doc page | |
| ☐ | Docs index — `/docs` redirects to Getting started | |
| ☐ | Pagefind search finds a term (e.g. “SmartType”, “revision”) | |
| ☐ | Each doc page loads and sidebar matches section list | |
| ☐ | `ScreenplayBlock` examples render with Courier margins | |
| ☐ | Landing → docs visual continuity (dark ink theme, revision accents) | |

**Doc pages to spot-check:** Getting started · The editor · Story tools · AI assistant · Production · Your files · Keyboard shortcuts · Why Dastan · FAQ & troubleshooting

---

## Hub & first run

| Done | Item | Notes |
|:----:|------|-------|
| ☐ | Fresh profile: sample script “The Last Garden” seeds once | |
| ☐ | Onboarding tour opens on first editor visit (Skip / Next work) | |
| ☐ | Create new script from hub | |
| ☐ | Open recent script | |
| ☐ | Rename script from top bar | |
| ☐ | Trash — soft-delete, restore, 30-day retention message | |
| ☐ | Templates (if any) open correctly | |
| ☐ | Dark / light / system theme toggle | |

---

## Core writing

| Done | Item | Notes |
|:----:|------|-------|
| ☐ | Tab — next element type in cycle | |
| ☐ | Shift+Tab — previous element | |
| ☐ | Enter — new block / SmartType accept | |
| ☐ | Scene headings force uppercase | |
| ☐ | Character cues force uppercase | |
| ☐ | Empty block + Enter — element picker | |
| ☐ | ⌘1–⌘0 — jump to element types | |
| ☐ | Alt+letter shortcuts (S/A/C/D/P/T/G) | |
| ☐ | Undo / redo (⌘Z / ⌘⇧Z) | |
| ☐ | Floating toolbar — bold, italic, underline, colors | |
| ☐ | Dual dialogue (via toolbar) | |
| ☐ | Script notes on a block | |
| ☐ | Find & replace (⌘F, ⌘G, ⌘⇧G) | |
| ☐ | Force save (⌘S) — status indicator updates | |
| ☐ | Reload page — content persists (IndexedDB) | |
| ☐ | Shortcuts modal (`?`) matches behavior | |

**Element types:** Scene Heading · Action · Character · Dialogue · Parenthetical · Transition · Centered · Shot · General · Lyrics

---

## SmartType

| Done | Item | Notes |
|:----:|------|-------|
| ☐ | Character name suggestions after typing a cue | |
| ☐ | Location suggestions on scene headings | |
| ☐ | ↑/↓ + Enter accepts suggestion | |
| ☐ | Tab advances scene-heading segments (INT. / EXT. / etc.) | |

---

## Editor modes & view

| Done | Item | Notes |
|:----:|------|-------|
| ☐ | **Focus mode** (⌘.) — chrome hides, exit restores UI | |
| ☐ | **Typewriter mode** (⌘⇧T) — cursor stays in center band while typing | |
| ☐ | Typewriter — manual scroll suspends auto-scroll | |
| ☐ | Typewriter — respects `prefers-reduced-motion` | |
| ☐ | **Page view** — decorative page frames + page count | |
| ☐ | Page fit / zoom levels feel correct | |
| ☐ | Title page editor | |
| ☐ | Navigator — scene list jumps to slugline | |
| ☐ | **Structure lines** — gutter ribbons + navigator dots | |
| ☐ | Writing sprint chip — start timer, word count, end sprint | |
| ☐ | Runtime / page stats in top bar | |

> **Pagination honesty:** live page view is **approximate** (heuristic breaks, not true WYSIWYG). PDF export uses separate layout logic. See `future-tasks.md`.

---

## Workspace — Develop & World

| Done | Item | Notes |
|:----:|------|-------|
| ☐ | Switch workspace tabs: Script · Develop · World | |
| ☐ | **Develop → Basics** — logline, synopsis, acts | |
| ☐ | **Develop → Outline** — structure beats | |
| ☐ | **Develop → Beat board** — cards, reorder, link to scenes | |
| ☐ | **Develop → Treatment** | |
| ☐ | **World → Characters** — profiles persist | |
| ☐ | **World → Locations** — profiles persist | |
| ☐ | **World → Notes** — global notes | |
| ☐ | Sidebar collapse (⌘\\) | |
| ☐ | Workspace data survives reload | |

---

## Production features

| Done | Item | Notes |
|:----:|------|-------|
| ☐ | Scene numbering — lock numbers, renumber | |
| ☐ | **A-scenes** — insert A13, B13, multi-insert, delete | |
| ☐ | **OMITTED** scene styling | |
| ☐ | Start **revision set** — pick color (white/blue/pink/yellow/green/goldenrod) | |
| ☐ | Revision baseline snapshot on set start | |
| ☐ | Change marks (margin asterisks) on edited blocks | |
| ☐ | Colored revision borders on changed blocks | |
| ☐ | Revision banner when pages are “locked” | |
| ☐ | Scene / character / location **reports** | |
| ☐ | Inspector panel — layout & production options | |

> **Not built yet:** true colored production pages and page locking (needs real pagination). Revision mode is border + change marks only.

---

## Import, export & files

| Done | Item | Notes |
|:----:|------|-------|
| ☐ | Import `.fountain` | |
| ☐ | Import `.fdx` (keep backup — complex metadata may not round-trip) | |
| ☐ | Import `.txt` | |
| ☐ | Import `.pdf` (if enabled in build) | |
| ☐ | Export `.fountain` | |
| ☐ | Export `.txt` | |
| ☐ | Export `.fdx` | |
| ☐ | Export **PDF** (print dialog / revision options) | |
| ☐ | **Version history** — list snapshots, diff view | |
| ☐ | Per-passage restore from version diff | |
| ☐ | Manual version snapshot | |
| ☐ | Offline — airplane mode, edit, reload still works (PWA) | |

---

## AI assistant (BYOK)

| Done | Item | Notes |
|:----:|------|-------|
| ☐ | Settings → AI — add provider key (OpenAI / Anthropic / Google / OpenRouter / Ollama) | |
| ☐ | Pick default model or Auto | |
| ☐ | Open AI chat (⌘L) | |
| ☐ | **Ask mode** — advice only, no edit proposals | |
| ☐ | **Planner mode** — structured suggestions, manual apply | |
| ☐ | **Editor mode** — tool calls enabled | |
| ☐ | Context chips show script / workspace scope | |
| ☐ | Selection sent when text is highlighted | |
| ☐ | Editor tool preview — **Accept** applies change | |
| ☐ | Editor tool preview — **Reject** discards change | |
| ☐ | Thread sidebar — new thread, switch threads | |
| ☐ | AI memories (if configured) persist | |
| ☐ | Ollama local — works with default base URL | |

> Requires a valid API key (or local Ollama). Without keys, chat should fail gracefully with setup guidance.

---

## Settings & account

| Done | Item | Notes |
|:----:|------|-------|
| ☐ | Settings (⌘,) — all tabs load | |
| ☐ | **Documentation** link opens docs URL | |
| ☐ | Editor theme / typography preferences | |
| ☐ | Typewriter mode preference persists | |
| ☐ | Local-only account badge / modal (no cloud) | |
| ☐ | Cloud account section shows expected placeholder state | |
| ☐ | Share dialog — copy link / permissions UI (collab: coming soon) | |

---

## Collaboration (partial / preview)

| Done | Item | Notes |
|:----:|------|-------|
| ☐ | Peer avatars appear when collaboration active | |
| ☐ | Typewriter pauses when peers connected | |
| ☐ | Real-time co-editing (if wired in your env) | |

> Dedicated “follow peer cursor” UI is **not implemented**. Collaboration is marked “coming soon” on the marketing site.

---

## Build & CI sanity

| Done | Item | Notes |
|:----:|------|-------|
| ☐ | `npm test` — all workspace tests green | |
| ☐ | `npm run build` — web app builds | |
| ☐ | `npm run site:build` — site + docs build | |
| ☐ | `cd apps/site && npx astro check` — 0 errors | |

---

## Known gaps (don’t file as bugs)

These are documented deferrals — verify behavior matches expectations, not a missing feature:

- True WYSIWYG pagination and `(MORE)` / `(CONT'D)` in live editor
- Full colored revision pages + page locking
- Real-time collaboration (product claim: coming soon)
- Managed cloud AI / entitlements gating
- Automated backup-on-save folder
- AI thread pinning UI (unverified in codebase)

See [`future-tasks.md`](future-tasks.md) for details.

---

## Session log

| Date | Tester | Build / branch | Summary |
|------|--------|----------------|---------|
| | | | |
