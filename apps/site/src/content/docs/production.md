---
draft: false
title: Production
description: Revisions, scene numbers, reports, and export.
---

Tools for revision tracking, reports, and industry export.

## Revision sets

In the **Writer inspector → Document → Revision Sets**:

1. Pick a color (White, Blue, Pink, Yellow, Green, Goldenrod — `REVISION_SET_ORDER` in `revision-mode.ts`).
2. Dastan **force-saves**, creates a **manual version snapshot** labeled with the revision color, and starts tracking changes against that baseline (`handleStartRevisionSet` in `ScreenplayEditor.tsx`).
3. Turn on **Revision mode** to show colored margin marks on changed blocks.

Change marks compare the live script to the active set's `baselineVersionId` snapshot (`resolveBaselineSnapshot` + `getChangedBlockIndices`).

Toggle **Show change marks** in script actions → View.

## PDF export with revision metadata

Export → PDF opens a dialog. You can include margin asterisks for changed blocks. When revision mode is active, export adds revision header, history box, and colored border (`packages/export` `PdfExportOptions`).

## Locking scene numbers & A-scenes

Writer inspector → **Lock scene numbers** snapshots current ordinals into `sceneNumberLocks` (scene-index keyed).

When you insert a scene between locked numbers, Dastan applies **Final Draft-style A-scenes**: the new scene gets a letter prefix on the **following** scene's number (`A13`, `B13`, …) — see `scene-numbering.ts`.

Editor scene numbers use `data-scene-number` when locks are active.

## OMITTED scenes

With a scene heading selected, Writer inspector → **Mark omitted** sets `omitted` on the heading (`toggleSceneOmitted`). Omitted headings render with reduced opacity and an `OMITTED` label in the editor CSS.

## Production reports

Script actions → **Production reports** opens scene, character, and location breakdowns (`ReportsPanel.tsx`, `production-reports.ts`).

## Title page

Writer inspector → enable **Show title page**. Edit fields in the title page panel (`TitlePagePanel.tsx`). Title page can export with PDF layout.

## Headers & footers

Writer inspector → **Page Layout** and header/footer templates use `renderLayoutTemplate` with `{title}`, `{page}`, `{author}`, `{date}` tokens.

## MORE / (CONT'D)

Writer inspector → **Dialogue breaks** configures automatic MORE and (CONT'D) text for dialogue and scenes crossing pages in **export** (`dialogueBreaks` / `sceneBreaks` on document layout). Live editor pagination does not yet flow these automatically — see limitation below.

## Export formats

| Format | Menu path |
|--------|-----------|
| Fountain | Script actions → Export → Fountain |
| Plain text | Export → Plain text |
| Final Draft (.fdx) | Export → Final Draft |
| PDF | Export → PDF (print) |

Import supports `.fountain`, `.fdx`, `.txt`, and `.pdf` (`ScreenplayEditor` import accept list).

## Pagination honesty

**On-screen page view is an estimate** (decorative frames + heuristics in `page-breaks.ts`). **Exported PDF** uses the dedicated layout pipeline in `@dastan/export` and is authoritative for print.

True WYSIWYG pagination and page locking are **not** implemented yet — see [Why Dastan](/docs/why-dastan/) and `future-tasks.md`.
