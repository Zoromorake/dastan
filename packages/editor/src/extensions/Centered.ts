import { createScreenplayBlockExtension } from './createScreenplayBlock';

export const Centered = createScreenplayBlockExtension({
	name: 'centered',
	className: 'screenplay-centered mx-auto max-w-[420px] text-center',
	enterTarget: 'action',
	tabTarget: 'action',
	backspaceTarget: 'action',
});
