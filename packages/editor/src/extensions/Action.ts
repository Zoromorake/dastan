import { createScreenplayBlockExtension } from './createScreenplayBlock';

export const Action = createScreenplayBlockExtension({
  name: 'action',
  className: 'block min-h-6 w-full',
  enterTarget: 'action',
  tabTarget: 'character',
  shiftTabTarget: 'scene_heading',
  backspaceTarget: 'scene_heading',
});
