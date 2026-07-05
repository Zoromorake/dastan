# Contributing to Dastan

Thank you for your interest in contributing. Dastan is an AGPL-3.0 open-core screenplay platform with optional proprietary cloud services in a separate repository.

## Contributor License Agreement

All contributions require signing the [Harmony Individual Contributor Assignment Agreement (CLA.md)](CLA.md). Copyright is assigned to the project so Dastan can offer dual licensing (AGPL + commercial).

**How to sign:** When you open a pull request, the [CLA Assistant](https://github.com/contributor-assistant/github-action) bot will comment with instructions. First-time contributors comment:

`I have read the CLA Document and I hereby sign the CLA`

Signatures are stored in `signatures/version1/cla.json`. Corporate contributors should use the [Harmony Entity CAA](https://www.harmonyagreements.org/agreements.html) — contact maintainers before your first PR.

> Replace `[JURISDICTION]` and confirm the assignee entity in `CLA.md` before opening the repo to external contributors — see [future-tasks.md](future-tasks.md).

## Development setup

```bash
git clone <your-fork-url>
cd dastan
npm install
cp .env.example .env.local   # optional — local dev works without cloud env vars
npm run dev                  # http://localhost:5173
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in placeholders for Supabase and cloud adapters. Never commit `.env.local` or real API keys.

Local AI chat uses the Vite dev proxy at `/api/chat` when `VITE_AI_CHAT_URL` is unset. Provider API keys are entered in the app (Settings → AI) and stored only in the browser.

## Before opening a PR

1. **Tests** — `npm test` must pass across all workspaces.
2. **Build** — `npm run build` must succeed.
3. **Scope** — Keep changes focused. One logical fix or feature per commit when possible.
4. **Dependencies** — Do not add new npm packages without justification in the PR description. Prefer what is already installed.

## AGPL / cloud boundary

This is a hard rule for the public monorepo:

- **Do not import from `cloud/` or `dastan-cloud` into `packages/*` or shared public code.** Cloud code implements `@dastan/plugin-api` interfaces; the core never depends on cloud.
- New cloud features belong in the private cloud repository and register via the plugin API at runtime.
- The `cloud/` folder in this repo is gitignored scaffolding for local integration only.

## Project structure

```text
apps/web/           Main Vite + React app
packages/           AGPL libraries (editor, parser, storage, ai-providers, plugin-api, ui)
supabase/           Edge functions (AI chat proxy)
docs/               Architecture and integration specs
```

See [README.md](README.md) for keyboard shortcuts, routes, and Supabase deployment notes.

## Reporting issues

Use the GitHub issue templates for bugs and feature requests. Include reproduction steps, expected vs. actual behavior, and your environment (browser, OS) for bugs.

## Code style

Match the surrounding code: TypeScript strict mode, existing naming conventions, minimal comments (explain non-obvious business logic only). Reuse `@dastan/ui` primitives instead of hand-rolling dialogs and buttons.
