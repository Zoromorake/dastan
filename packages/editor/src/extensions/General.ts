import { createScreenplayBlockExtension } from './createScreenplayBlock';

export const General = createScreenplayBlockExtension({
	name: 'general',
	className: 'screenplay-general',
	enterTarget: 'action',
	tabTarget: 'action',
	backspaceTarget: 'action',
});
