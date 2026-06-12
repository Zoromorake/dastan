import { createScreenplayBlockExtension } from './createScreenplayBlock';

export const Dialogue = createScreenplayBlockExtension({
  name: 'dialogue',
  className: 'block min-h-6 ml-[1in] w-[3.5in] screenplay-dual-dialogue',
  supportsDualDialogue: true,
  enterTarget: 'character',
  emptyEnterTarget: 'action',
  tabTarget: 'parenthetical',
  shiftTabTarget: 'character',
  backspaceTarget: 'character',
  openParenTarget: 'parenthetical',
});
