import { createScreenplayBlockExtension } from './createScreenplayBlock';

export const Transition = createScreenplayBlockExtension({
  name: 'transition',
  className: 'block min-h-6 ml-auto w-fit text-right uppercase',
  enterTarget: 'scene_heading',
  tabTarget: 'scene_heading',
  shiftTabTarget: 'parenthetical',
  backspaceTarget: 'parenthetical',
});
