---
draft: false
title: Your files
description: Storage, import/export, versions, and trash.
---

## Where data lives today

Dastan stores scripts, projects, versions, and workspace data in the browser **IndexedDB** database managed by `@dastan/local-storage` (`screenplay-storage.ts`). Nothing is uploaded to a server unless you enable cloud features in a future build.

Settings (theme, AI keys, typewriter mode) live in **localStorage** (`user-settings.ts`, `ai-settings.ts`).

**Why local-first:** your draft should survive airplane mode, spotty Wi‑Fi, and vendor outages. The file of record is on your machine.

## Automatic save

The editor queues saves on change (`useScreenplayPersistence`). `⌘S` forces an immediate save. Last-opened document id is remembered (`setLastDocumentId`).

## Import

From the editor menu → **Import**, or drag a file onto the hub. Supported extensions:

- `.fountain`
- `.fdx` (Final Draft XML)
- `.txt` (plain text / Fountain-like)
- `.pdf` (text extraction — results vary by PDF)

## Export

See [Production](/docs/production/). Exported files are yours to commit, email, or back up anywhere.

## Version history

**Version history** (menu or navigator) lists automatic snapshots plus manual checkpoints.

- **Restore** replaces the whole document with a snapshot.
- **Per-passage restore** — from the diff view, restore individual removed lines (`version-restore-hunk.ts`).

Starting a **revision set** also creates a labeled manual snapshot used as the change-mark baseline.

## Trash & recovery

Deleting a script or project **moves it to Trash** (`softDeleteDocument` / `softDeleteProject`) with a `deletedAt` timestamp.

Trash items are kept for **30 days** (`TRASH_RETENTION_MS` in `screenplay-storage.ts`), then purged by `purgeExpiredTrash`. Restore from the Trash section in the hub before then.

## Backup recommendations

Until cloud sync ships:

1. Export important scripts to **Fountain** or **FDX** regularly.
2. Avoid clearing site data for the Dastan origin in your browser.
3. Use browser sync profiles cautiously — IndexedDB may not roam the way you expect across devices.


<!-- UNVERIFIED: automated export-on-save or backup folder — not found in codebase -->


## PWA / offline

The web app is built as an offline-capable PWA (`vite` PWA plugin). Installed copies load from cache; data remains in that browser's IndexedDB.

## AGPL and your writing

Using Dastan to write screenplays does **not** affect your copyright in your scripts. AGPL applies to the **software**, not your creative work. See [Why Dastan](/docs/why-dastan/).
