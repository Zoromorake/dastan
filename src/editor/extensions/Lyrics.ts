import { createScreenplayBlockExtension } from './createScreenplayBlock';

export const Lyrics = createScreenplayBlockExtension({
	name: 'lyrics',
	className: 'screenplay-lyrics mx-auto max-w-[420px] text-center italic',
	enterTarget: 'lyrics',
	tabTarget: 'action',
	backspaceTarget: 'action',
});
