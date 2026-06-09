import { mergeAttributes, Node } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import type { ScreenplayBlockType } from '../../types';
import { setBlockType, splitToBlockType } from '../commands';

interface ScreenplayBlockOptions {
  name: ScreenplayBlockType;
  className: string;
  enterTarget: ScreenplayBlockType;
  emptyEnterTarget?: ScreenplayBlockType;
  tabTarget: ScreenplayBlockType;
  shiftTabTarget?: ScreenplayBlockType;
  backspaceTarget?: ScreenplayBlockType;
  shiftEnterTarget?: ScreenplayBlockType;
  openParenTarget?: ScreenplayBlockType;
  normalizeSceneHeadingOnSpace?: boolean;
  normalizeCharacterCueOnEnter?: boolean;
  supportsDualDialogue?: boolean;
}

function handleTransition(editor: Editor, nextBlockType: ScreenplayBlockType, splitCurrentBlock: boolean): boolean {
  if (splitCurrentBlock) {
    return splitToBlockType(editor, nextBlockType);
  }

  return setBlockType(editor, nextBlockType);
}

function isCurrentBlockEmpty(editor: Editor): boolean {
  const text = editor.state.selection.$from.parent.textContent;
  return text.trim().length === 0;
}

function isCursorAtEnd(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  return $from.parentOffset === $from.parent.content.size;
}

function getCurrentBlockText(editor: Editor): string {
  return editor.state.selection.$from.parent.textContent;
}

function replaceCurrentBlockText(editor: Editor, nextText: string): boolean {
  const { $from } = editor.state.selection;
  const from = $from.start();
  const to = $from.end();

  return editor
    .chain()
    .focus()
    .insertContentAt({ from, to }, nextText)
    .setTextSelection(from + nextText.length)
    .run();
}

function canonicalizeSceneHeadingPrefix(rawText: string): string | null {
  const trimmed = rawText.trim().toUpperCase();

  if (trimmed.length === 0 || /\s/u.test(trimmed)) {
    return null;
  }

  if (trimmed === 'INT' || trimmed === 'INT.') {
    return 'INT. ';
  }

  if (trimmed === 'EXT' || trimmed === 'EXT.') {
    return 'EXT. ';
  }

  if (trimmed === 'I/E' || trimmed === 'INT/EXT' || trimmed === 'INT./EXT.' || trimmed === 'INT./EXT') {
    return 'INT./EXT. ';
  }

  if (trimmed === 'E/I' || trimmed === 'EXT/INT' || trimmed === 'EXT./INT.' || trimmed === 'EXT./INT') {
    return 'EXT./INT. ';
  }

  return null;
}

function normalizeCharacterCue(rawText: string): string {
  let next = rawText.trim().replace(/\s+/gu, ' ').toUpperCase();

  next = next
    .replace(/\(\s*V\.?\s*O\.?\s*\)/giu, '(V.O.)')
    .replace(/\(\s*O\.?\s*S\.?\s*\)/giu, '(O.S.)')
    .replace(/\(\s*CONT['’]?D\s*\)/giu, "(CONT'D)")
    .replace(/\s*\(\s*/gu, ' (')
    .replace(/\s*\)\s*/gu, ')')
    .replace(/\s+/gu, ' ')
    .trim();

  return next;
}

export function createScreenplayBlockExtension(options: ScreenplayBlockOptions) {
  return Node.create({
    name: options.name,
    group: 'block',
    content: 'inline*',
    defining: true,
    selectable: true,
    addAttributes() {
      if (!options.supportsDualDialogue) {
        return {};
      }

      return {
        dualDialogue: {
          default: false,
          parseHTML: (element) => element.getAttribute('data-dual-dialogue') === 'true',
          renderHTML: (attributes) => (attributes.dualDialogue ? { 'data-dual-dialogue': 'true' } : {}),
        },
      };
    },
    addKeyboardShortcuts() {
      return {
        Enter: () => {
          if (options.normalizeCharacterCueOnEnter) {
            const currentText = getCurrentBlockText(this.editor);
            const normalized = normalizeCharacterCue(currentText);

            if (normalized.length > 0 && normalized !== currentText) {
              const updated = replaceCurrentBlockText(this.editor, normalized);

              if (!updated) {
                return false;
              }
            }
          }

          if (options.emptyEnterTarget && isCurrentBlockEmpty(this.editor)) {
            return handleTransition(this.editor, options.emptyEnterTarget, false);
          }

          return handleTransition(this.editor, options.enterTarget, true);
        },
        Space: () => {
          if (!options.normalizeSceneHeadingOnSpace || !isCursorAtEnd(this.editor)) {
            return false;
          }

          const canonical = canonicalizeSceneHeadingPrefix(getCurrentBlockText(this.editor));

          if (!canonical) {
            return false;
          }

          return replaceCurrentBlockText(this.editor, canonical);
        },
        '(': () => {
          if (!options.openParenTarget || !isCurrentBlockEmpty(this.editor)) {
            return false;
          }

          return setBlockType(this.editor, options.openParenTarget);
        },
        Tab: () => setBlockType(this.editor, options.tabTarget),
        ...(options.shiftTabTarget
          ? {
              'Shift-Tab': () => setBlockType(this.editor, options.shiftTabTarget as ScreenplayBlockType),
            }
          : {}),
        ...(options.shiftEnterTarget
          ? {
              'Shift-Enter': () => handleTransition(this.editor, options.shiftEnterTarget as ScreenplayBlockType, true),
            }
          : {}),
      };
    },
    parseHTML() {
      return [{ tag: `div[data-block-type="${options.name}"]` }];
    },
    renderHTML({ HTMLAttributes }) {
      return [
        'div',
        mergeAttributes(HTMLAttributes, {
          'data-block-type': options.name,
          class: options.className,
        }),
        0,
      ];
    },
  });
}
