# Dastan

Local-first, open-core screenplay writing platform. Built with React, TipTap, IndexedDB, and Vite.

> **Writing is free.** AI compute, convenience, collaboration, and enterprise support fund the project.

Licensed under [AGPL-3.0](LICENSE). See [TRADEMARK.md](TRADEMARK.md) and [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

## Monorepo structure

```text
apps/
  web/          # Main Vite + React app (@dastan/web)
  desktop/      # Placeholder for future native shell
  mobile/       # Placeholder for future mobile shell
packages/
  screenplay-model/   # Domain types and layout defaults
  fountain-parser/    # Fountain / FDX / txt import-export
  export/             # PDF print export
  local-storage/      # IndexedDB persistence
  editor/             # TipTap screenplay extensions
  ui/                 # Shared shadcn/ui primitives
  ai-providers/       # BYOK AI provider types and chat handler
  plugin-api/         # Service interfaces for cloud and plugins
docs/
  CLOUD-REPO.md       # Private dastan-cloud integration guide
cloud/                # Proprietary cloud scaffold (not in workspaces)
supabase/             # Edge functions (AI chat proxy)
```

Cloud services live in a **separate private repository** and implement `@dastan/plugin-api` interfaces — the core never depends on them.

## Features

- Vault hub with projects, recent files, trash, and templates
- Screenplay editor with industry block types
- Import: `.fountain`, `.fdx`, `.txt`, `.pdf`
- Export: `.fountain`, `.txt`, `.fdx`, PDF (print)
- Workspace tabs: outline, beat board, characters, locations, notes
- Version history, focus mode, page view, title page, SmartType
- Soft-delete trash with 30-day retention
- AI writing assistant with BYOK provider keys
- Offline-first PWA — fully usable without cloud

## Development

```bash
npm install
npm run dev      # starts @dastan/web
npm test         # all workspace tests
npm run build    # production build
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (`apps/web`) |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest across workspaces |

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘S | Save |
| ⌘\\ | Toggle sidebar |
| ⌘L | Toggle AI chat |
| ⌘. | Focus mode |
| ⌘1–6 | Core screenplay elements |
| ⌘7–0 | Centered, shot, general, lyrics |
| TAB / SHIFT+TAB | Cycle elements |
| ? | Shortcuts modal |

## Routes

- `/` — Vault hub
- `/project/:projectId` — Vault filtered to a project
- `/script/:documentId` — Script editor

## Data storage

Scripts, projects, and version history are stored locally in IndexedDB. Optional cloud sync, auth, and collaboration are implemented via proprietary adapters — see [docs/CLOUD-REPO.md](docs/CLOUD-REPO.md).

## Supabase (AI chat backend)

Dastan uses a Supabase edge function as an optional BYOK AI chat proxy in production.

```bash
cp .env.example .env.local
# Add provider API keys in the app: Settings → AI

supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy chat --no-verify-jwt
```

Local dev uses `/api/chat` via the Vite plugin when `VITE_AI_CHAT_URL` is unset. Shared handler logic lives in `@dastan/ai-providers/server`.

## Contributing

1. Core packages under `packages/` are AGPL-3.0
2. Do not import from proprietary `dastan-cloud` into public packages
3. New cloud features implement `@dastan/plugin-api` interfaces
4. Run `npm test` and `npm run build` before opening a PR
