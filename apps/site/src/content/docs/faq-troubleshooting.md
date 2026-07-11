---
draft: false
title: FAQ & troubleshooting
description: Common issues and fixes.
---

## Is Dastan really free?

Yes for **writing** — local editor, import/export, version history, and workspace tools are free in the open-source app.

Future **cloud sync**, **managed AI**, and **collaboration** may be paid. That does not remove your ability to write locally without them.

## Where is my script stored?

In **IndexedDB** in the browser profile you used to write. It is not on Dastan's servers by default. See [Your files](/docs/your-files/).

## Does the AI train on my writing?

**No** — when using BYOK, your browser sends prompts to **your** provider with **your** key. Dastan does not operate a training pipeline on your scripts in the open-source app.

If you point `chatApiUrl` at a third-party proxy, that proxy's policy applies — read its terms.

## Can I open Final Draft files?

Yes — import **.fdx** (Final Draft XML). Complex production features in FDX may round-trip imperfectly; always keep a backup of the original.

## What if Dastan disappears?

1. Your files are in IndexedDB — export to Fountain/FDX/PDF regularly.
2. The code is open source (AGPL) — someone can fork and maintain it.
3. Standard formats (Fountain, FDX) reduce lock-in.

## Import looks wrong

- **PDF import** depends on text extraction quality; scanned PDFs may fail.
- **Fountain** files with non-standard extensions should use `.fountain` or `.txt`.
- Check for stray tabs vs spaces in scene headings.

## Ollama will not connect

1. Run Ollama locally (`ollama serve`).
2. Settings → AI → set base URL to `http://localhost:11434/v1` (default in `defaultOllamaBaseUrl`).
3. Browser must reach localhost — some locked-down environments block this.
4. Pick a model you have pulled (`ollama pull llama3.2`).

## Browser storage limits

IndexedDB quotas vary by browser and disk space. Very large vaults may hit limits. Export older projects and remove trash.

Clearing **site data** for Dastan's origin **deletes your vault** — export first.

## PWA install

Install from the browser's "Add to Home Screen" / "Install app" prompt when offered by the PWA manifest. Offline behavior requires the app shell to be cached at least once while online.

## Typewriter mode scrolls too much / not enough

Typewriter mode only adjusts scroll when the caret leaves a **center band** (~15% of the viewport). Manual scrolling pauses auto-scroll until you type again. With `prefers-reduced-motion`, scrolling is instant.

## Structure lines do not show

1. Link structure beats to scenes in **Develop → Structure**.
2. Enable **Show structure lines** in script actions → View.
3. Beats need a `linkedSceneIndex` — use auto-map or link manually.

## Change marks after revision set

Ensure a revision set is **started** (creates baseline snapshot) and **Show change marks** is on. Only blocks that differ from the baseline snapshot are marked.

## Still stuck?

Open an issue on GitHub or email the contact address listed on the project homepage with browser, steps, and whether you use BYOK or local-only mode.
