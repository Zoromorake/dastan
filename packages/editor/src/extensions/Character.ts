import { createScreenplayBlockExtension } from './createScreenplayBlock';

export const Character = createScreenplayBlockExtension({
  name: 'character',
  className: 'block min-h-6 w-full text-center uppercase screenplay-dual-character',
  supportsDualDialogue: true,
  enterTarget: 'dialogue',
  emptyEnterTarget: 'action',
  tabTarget: 'parenthetical',
  shiftTabTarget: 'action',
  backspaceTarget: 'action',
  shiftEnterTarget: 'action',
  openParenTarget: 'parenthetical',
  normalizeCharacterCueOnEnter: true,
});
