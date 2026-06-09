# Dastan

Local-first screenplay writing app inspired by Final Draft Cloud. Built with React, TipTap, IndexedDB, and Vite.

## Features

- Vault hub with projects, recent files, trash, and templates
- Screenplay editor with industry block types (scene heading, action, character, dialogue, parenthetical, transition, centered, shot, general, lyrics)
- Import: `.fountain`, `.fdx`, `.txt`, `.pdf`
- Export: `.fountain`, `.txt`, `.fdx`, PDF (print)
- Workspace tabs: outline, beat board, character profiles, location bible, notes
- Version history, focus mode, page view, title page, SmartType suggestions
- Soft-delete trash with 30-day retention
- AI writing assistant chat panel with model switching, memories, and screenplay context

## Development

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck and production build
- `npm run preview` — preview production build
- `npm test` — run Vitest unit tests

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

Scripts, projects, and version history are stored locally in IndexedDB. Sign-in and cloud sync are planned for a future release.

## Supabase (AI chat backend)

Dastan uses a separate Supabase project (`dastan-dev`) for the AI chat edge function.

```bash
cp .env.example .env.local
# Add your provider API keys in the app: Settings → AI

supabase login
supabase link --project-ref lbnkjcxtnguslqoacmua
supabase functions deploy chat --no-verify-jwt
```

Local dev falls back to `/api/chat` via the Vite plugin when `VITE_AI_CHAT_URL` is unset.
