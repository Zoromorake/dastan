import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddHubFileButtonProps {
	isDark: boolean;
	size?: 'sm' | 'default';
	onAddFile: (file: File) => void;
}

export function AddHubFileButton({ isDark, size = 'default', onAddFile }: AddHubFileButtonProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const isSmall = size === 'sm';

	return (
		<>
			<button
				className={cn(
					'inline-flex shrink-0 items-center gap-1.5 rounded-md border font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50',
					isSmall ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-sm',
					'border-border bg-background text-foreground hover:bg-accent',
				)}
				type="button"
				onClick={() => inputRef.current?.click()}
			>
				<Paperclip size={isSmall ? 14 : 16} />
				Add file
			</button>
			<input
				ref={inputRef}
				accept="*/*"
				className="hidden"
				type="file"
				onChange={(event) => {
					const file = event.target.files?.[0];

					if (file) {
						onAddFile(file);
					}

					event.target.value = '';
				}}
			/>
		</>
	);
}
