import type { UIMessage } from 'ai';
import { Copy, RotateCcw } from 'lucide-react';

interface AiChatMessagesProps {
	messages: UIMessage[];
	status: 'submitted' | 'streaming' | 'ready' | 'error';
	isDark: boolean;
	onRegenerate?: () => void;
}

function getMessageText(message: UIMessage): string {
	return message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join('');
}

export function AiChatMessages({ messages, status, isDark, onRegenerate }: AiChatMessagesProps) {
	const bubbleUser = isDark ? 'bg-amber-950/50 text-amber-50' : 'bg-amber-50 text-stone-900';
	const bubbleAssistant = isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-stone-800';
	const mutedClass = isDark ? 'text-slate-500' : 'text-stone-500';

	if (messages.length === 0) {
		return (
			<div className={`flex h-full flex-col items-center justify-center px-6 text-center text-sm ${mutedClass}`}>
				<p className="font-medium">Ask about your screenplay</p>
				<p className="mt-2 max-w-xs leading-6">
					Get help with dialogue, structure, character arcs, and beat planning. Script context is included when enabled.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4 px-4 py-4">
			{messages.map((message, index) => {
				const text = getMessageText(message);
				const isUser = message.role === 'user';
				const isLastAssistant = !isUser && index === messages.length - 1;

				return (
					<div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
						<div className={`max-w-[92%] rounded-2xl px-3 py-2.5 text-sm leading-6 ${isUser ? bubbleUser : bubbleAssistant}`}>
							<div className={`mb-1 text-[10px] uppercase tracking-[0.16em] ${mutedClass}`}>
								{isUser ? 'You' : 'Assistant'}
							</div>
							<div className="whitespace-pre-wrap">{text}</div>
							{!isUser ? (
								<div className="mt-2 flex items-center gap-2">
									<button
										className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-stone-200 text-stone-500 hover:text-stone-800'}`}
										type="button"
										onClick={() => void navigator.clipboard.writeText(text)}
									>
										<Copy size={12} />
										Copy
									</button>
									{isLastAssistant && status === 'ready' && onRegenerate ? (
										<button
											className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-stone-200 text-stone-500 hover:text-stone-800'}`}
											type="button"
											onClick={onRegenerate}
										>
											<RotateCcw size={12} />
											Retry
										</button>
									) : null}
								</div>
							) : null}
						</div>
					</div>
				);
			})}

			{status === 'streaming' || status === 'submitted' ? (
				<div className={`px-1 text-xs ${mutedClass}`}>Assistant is writing…</div>
			) : null}
		</div>
	);
}
