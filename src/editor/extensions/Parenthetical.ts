import { createScreenplayBlockExtension } from './createScreenplayBlock';

export const Parenthetical = createScreenplayBlockExtension({
  name: 'parenthetical',
  className: "block min-h-6 ml-[1.75in] w-[2in] italic before:mr-1 before:content-['('] after:ml-1 after:content-[')']",
  enterTarget: 'dialogue',
  emptyEnterTarget: 'dialogue',
  tabTarget: 'dialogue',
  shiftTabTarget: 'dialogue',
  backspaceTarget: 'dialogue',
});
