import { createScreenplayBlockExtension } from './createScreenplayBlock';

export const Shot = createScreenplayBlockExtension({
	name: 'shot',
	className: 'screenplay-shot uppercase font-bold tracking-[0.08em]',
	enterTarget: 'action',
	tabTarget: 'action',
	backspaceTarget: 'action',
});
