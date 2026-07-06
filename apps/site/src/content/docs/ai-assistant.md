---
draft: false
title: AI assistant
description: BYOK setup, modes, and accept/reject edits.
---

Dastan includes an optional writing assistant powered by **your** API keys (BYOK). Dastan does not run a hosted model on your script by default.

## Philosophy

- **Assistant, not ghostwriter** — the AI proposes; you decide.
- **Every script mutation is reviewable** — Editor mode tool calls show an accept/reject preview before applying (`AiChatPanel.tsx`, `ai-tool-preview.ts`).
- **Your pages are not training data** — requests go from your browser to your provider with your key (`ai-settings.ts` stores keys in `localStorage`).

**Why:** writers should trust that help is optional, visible, and reversible.

## Setting up BYOK

Open **Settings → AI** (`UserSettingsPanel.tsx`, `AiProviderKeyCard`).

Supported providers (`ai-models.ts` / `AI_PROVIDER_LABELS`):

| Provider | Notes |
|----------|-------|
| **OpenAI** | API key |
| **Anthropic** | API key |
| **Google** | Gemini API key (OpenAI-compatible endpoint) |
| **OpenRouter** | Single key for many models |
| **Ollama** | Local server; default base URL `http://localhost:11434/v1` (`defaultOllamaBaseUrl`) |

Pick a default model from the registry or choose **Auto** (cheapest configured model first — `resolveAutoModel`).

Keys are saved in browser `localStorage` under `dastan.ai-settings.v1`. They are sent to your chosen provider when you chat — not to Dastan servers unless you configure a custom `chatApiUrl` pointing at one.

## Interaction modes

Stored in `localStorage` (`ai-interaction-mode.ts`):

| Mode | Behavior |
|------|----------|
| **Ask** | Read-only advice — no edit proposals |
| **Planner** | Structured suggestions you review and apply manually |
| **Editor** | Agentic — can call editor tools; mutations require accept/reject |

Editor mode enables tools (`interactionModeEnablesTools`).

## What the AI can see

Context is assembled in `ai-context.ts` and `ai-context-script.ts`:

**Workspace** (when `includeWorkspaceContext` is on):

- Logline, synopsis, act summaries
- Structure beats and beat board highlights
- Character/location profile names
- Treatment excerpt
- Collaborator presence summary when collaboration is active

**Script** (when `includeScriptContext` is on):

- If the full script fits within ~48k characters (`MAX_SCRIPT_CHARS`), the entire plain-text script is sent.
- Otherwise, **scene-anchored** packing:
  1. Full text of the **active scene** (from cursor block index)
  2. **Neighboring** scenes in full
  3. **Rolling summary** from workspace fields
  4. **Scene outline** (all headings)
  5. **Radiating excerpts** of other scenes until the budget is used

The chat panel shows **context chips** so you can see what is attached.

**Honest limit:** very long features are not sent word-for-word. The model always sees your cursor scene and neighbors; distant scenes may appear only as headings or short excerpts.

## Accept / reject for edits

In **Editor** mode, tools that change the script (`insert_scene`, `rewrite_dialogue`, etc. — see `SCRIPT_MUTATION_TOOLS` in `ai-tool-preview.ts`) queue a preview with a summary. You must **Accept** or **Reject** before changes apply (`acceptPendingTools` / `rejectPendingTools` in `AiChatPanel.tsx`).

## Memories & pinning


<!-- UNVERIFIED: pin-thread UI — confirm in AiChatThreadSidebar before documenting thread pinning details -->


Global rules and memory suggestions are controlled in Settings → AI (`globalRules`, `autoSuggestMemories`).

## Cloud / managed AI

The default `chatApiUrl` is `/api/chat` (Vite dev proxy) or `VITE_AI_CHAT_URL`. A managed Dastan cloud provider is **not** shipped in the open-source repo; BYOK works without cloud auth today.

## Security reminder

Anyone with access to your browser profile can read keys in localStorage. Use a machine you trust. Rotate keys if you share a computer.
