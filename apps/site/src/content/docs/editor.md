---
draft: false
title: The editor
description: Elements, shortcuts, SmartType, and view modes.
---

## Element types

Each block in the script is exactly one screenplay element. Supported types (from `@dastan/screenplay-model`):

| Element | Purpose |
|---------|---------|
| Scene Heading | `INT.` / `EXT.` location and time |
| Action | Description and stage direction |
| Character | Character cue (uppercase) |
| Dialogue | Spoken lines |
| Parenthetical | `(wryly)` under a character cue |
| Transition | `CUT TO:` etc. |
| Centered | Centered text (titles, chyrons) |
| Shot | Camera direction |
| General | Freeform general text |
| Lyrics | Song lyrics |

## Keyboard shortcuts — element jumps

From `ScreenplayKeymap.ts` and `commands.ts` (`blockTypeForShortcut`):

| Shortcut | Element |
|----------|---------|
| `⌘1` / `Ctrl+1` | Scene Heading |
| `⌘2` | Action |
| `⌘3` | Character |
| `⌘4` | Dialogue |
| `⌘5` | Parenthetical |
| `⌘6` | Transition |
| `⌘7` | Centered |
| `⌘8` | Shot |
| `⌘9` | General |
| `⌘0` | Lyrics |

**Alt shortcuts** (`editor-keyboard.ts`, `Alt` + letter, no other modifiers):

| Shortcut | Element |
|----------|---------|
| `Alt+S` | Scene Heading |
| `Alt+A` | Action |
| `Alt+C` | Character |
| `Alt+P` | Parenthetical |
| `Alt+D` | Dialogue |
| `Alt+T` | Transition |
| `Alt+G` | General |

## Writing flow

- **Tab / Shift+Tab** — cycle elements (`handleEditorSmartKeyboard`).
- **Enter** — advance or accept a SmartType suggestion on character, scene heading, or transition lines.
- **Empty block + Enter** — open the element picker menu.
- **Scene heading + Tab** — advances `INT.` → location → time, then splits to Action when complete (`scene-heading-tab.ts`).

**Why keyboard-first:** most drafts are written in flow state. Menus break rhythm; shortcuts don't.

## SmartType

When typing a **character**, **scene heading**, or **transition**, Dastan suggests names and locations drawn from the current script and workspace (`smarttype.ts`). Arrow keys highlight suggestions; **Enter** accepts.

Hidden suggestions can be restored from the Writer inspector SmartType section.

## Dual dialogue

Select character or dialogue blocks and use **Dual dialogue** on the floating toolbar (`EditorFloatingToolbar.tsx` → `toggleDualDialogue`). Side-by-side columns are styled via `data-dual-dialogue-side` in CSS.

## Find & replace

`⌘F` opens the find/replace panel. `⌘G` / `⌘⇧G` find next/previous match (see `ShortcutsModal.tsx`).

## View modes

| Mode | How to toggle | Behavior |
|------|---------------|----------|
| **Focus mode** | `⌘.` or Top Bar menu | Hides chrome; writing only |
| **Typewriter mode** | `⌘⇧T`, Settings → Preferences, or Script actions → View | Keeps the caret near vertical center while typing; pauses after manual scroll until the next keystroke; respects `prefers-reduced-motion` |
| **Dark / light** | Settings → Profile | Follows system or forced theme |

Typewriter mode is **off by default** and persisted in `user-settings.ts` (`typewriterMode`).

While collaboration peers are connected, typewriter scrolling is suspended 
<!-- UNVERIFIED: dedicated "follow peer cursor" UI not found in codebase; suspension uses active peer count -->
.

## Scene numbers

Toggle **Show scene numbers** in the script actions menu or Writer inspector. Locked numbers (production) are configured in the Writer inspector → Document.

## Structure lines

Script actions → View → **Show structure lines** toggles colored beat ribbons in the editor gutter and matching dots in the navigator (`viewOptions.showStructureLines`).

## Page view

The editor can show decorative page frames (`pageViewMode: 'paged'`). This is a **preview estimate**, not true WYSIWYG pagination — see [Production](/docs/production/).

## Inline formatting

Bold, italic, underline, strike, text color, and highlight are available from the floating toolbar on selected text.
