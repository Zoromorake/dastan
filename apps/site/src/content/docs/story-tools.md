---
draft: false
title: Story tools
description: Beat board, structure beats, and navigator.
---

Planning lives beside the script — not in a separate app.

## Workspace modes

From the editor top bar, switch between:

- **Script** — the screenplay
- **Develop** — basics, structure, beats, outline, treatment
- **World** — characters, locations, notes

Sub-navigation is in `EditorWorkspaceNav` / `EditorWorkspaceSubNav`.

## Beat board

**Develop → Beat Board** (`ScreenplayWorkspacePanel.tsx`, `beatBoard` in workspace data).

Add cards with a heading and beat summary. Drag to reorder. Beats are stored on the document workspace and included in AI context when enabled.

**Why:** index cards on a wall are how many writers outline before they draft. The beat board mirrors that without leaving the script.

## Structure beats & Structure Lines

**Develop → Structure** uses templates (three-act, save the cat, etc.) from `structure-coverage.ts` and `createStructureBeatsFromTemplate`.

Each beat has:

- **Label** — e.g. "Midpoint"
- **Summary** — your notes
- **Linked scene** — ties the beat to a scene heading block index (`linkedSceneIndex`)

**Structure Lines** (when enabled in script actions → View):

- Colored gutter ribbons in the editor span each beat's scene range (`StructureLineGutter.tsx`, `structure-line-spans.ts`)
- Matching color dots appear on scenes in the **navigator** for beats linked to that scene or its range

Run **Auto-map beats to scenes** in the structure panel to distribute links across existing scenes (`autoMapStructureBeatsToScenes`).

## Character & location profiles

**World → Characters / Locations** — freeform profiles keyed by name. Used for SmartType and AI workspace context.

## Treatment

**Develop → Treatment** — long-form prose stored in `workspace.development.treatment`.

## Scene navigator

The left **navigator** (outline section) lists scene headings with:

- Scene order number
- Structure beat dot (when Structure Lines are on)
- **Cast list** per scene — characters who speak in that scene (`scene-cast.ts`)

Click a scene to scroll the editor there.

## Scene reordering

Script actions menu → **Move scene up / down** reorders whole scenes in the document (`moveSceneInContent`).

## Version history (story context)

Menu → **Version history** stores automatic and manual snapshots. Per-passage restore is available from the diff view (`version-restore-hunk.ts`) — see [Your files](/docs/your-files/).
