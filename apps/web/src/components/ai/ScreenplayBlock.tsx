import { memo } from 'react';
import { CornerDownLeft, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseReplyScreenplayBlocks } from '../../utils/ai-reply-screenplay';

interface ScreenplayBlockProps {
	text: string;
	isDark: boolean;
	onInsert?: () => void;
}

export const ScreenplayBlock = memo(function ScreenplayBlock({
	text,
	isDark,
	onInsert,
}: ScreenplayBlockProps) {
	const blocks = parseReplyScreenplayBlocks(text);
	const actionBtnClass = isDark
		? 'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-slate-500 transition hover:bg-white/5 hover:text-slate-200'
		: 'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-stone-500 transition hover:bg-stone-100 hover:text-stone-800';

	return (
		<div className={cn('ai-chat-screenplay', isDark && 'ai-chat-screenplay--dark')}>
			<div className="ai-chat-screenplay__page">
				{blocks.map((block, index) => (
					<div
						key={`${block.type}-${index}-${block.text.slice(0, 24)}`}
						className={`ai-chat-screenplay__line ai-chat-screenplay__line--${block.type}`}
					>
						{block.text}
					</div>
				))}
			</div>
			<div className="mt-1.5 flex flex-wrap items-center gap-0.5 ai-chat-chrome">
				<button
					className={actionBtnClass}
					type="button"
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => void navigator.clipboard.writeText(text)}
				>
					<Copy size={12} />
					Copy
				</button>
				{onInsert ? (
					<button
						className={actionBtnClass}
						type="button"
						onMouseDown={(event) => event.preventDefault()}
						onClick={onInsert}
					>
						<CornerDownLeft size={12} />
						Insert
					</button>
				) : null}
			</div>
		</div>
	);
});
