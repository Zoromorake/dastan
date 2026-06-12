import { createScreenplayBlockExtension } from './createScreenplayBlock';

export const SceneHeading = createScreenplayBlockExtension({
  name: 'scene_heading',
  className: 'block min-h-6 w-full uppercase tracking-[0.18em]',
  enterTarget: 'action',
  tabTarget: 'action',
  shiftTabTarget: 'transition',
  backspaceTarget: 'transition',
  normalizeSceneHeadingOnSpace: true,
});
