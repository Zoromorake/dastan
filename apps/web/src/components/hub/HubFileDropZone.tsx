import { useCallback, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HubFileDropZoneProps {
	children: ReactNode;
	className?: string;
	isDark: boolean;
	disabled?: boolean;
	hint?: string;
	onAddFiles: (files: File[]) => void;
}

function hasFilePayload(event: DragEvent<HTMLElement>): boolean {
	return Array.from(event.dataTransfer.types).includes('Files');
}

function collectDroppedFiles(event: DragEvent<HTMLElement>): File[] {
	return Array.from(event.dataTransfer.files).filter((file) => file.size > 0);
}

export function HubFileDropZone({
	children,
	className,
	isDark,
	disabled = false,
	hint = 'Drop files to add them here',
	onAddFiles,
}: HubFileDropZoneProps) {
	const dragDepthRef = useRef(0);
	const [isDragging, setIsDragging] = useState(false);

	const resetDragState = useCallback(() => {
		dragDepthRef.current = 0;
		setIsDragging(false);
	}, []);

	const handleDragEnter = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			if (disabled || !hasFilePayload(event)) {
				return;
			}

			event.preventDefault();
			dragDepthRef.current += 1;
			setIsDragging(true);
		},
		[disabled],
	);

	const handleDragOver = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			if (disabled || !hasFilePayload(event)) {
				return;
			}

			event.preventDefault();
			event.dataTransfer.dropEffect = 'copy';
		},
		[disabled],
	);

	const handleDragLeave = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			if (disabled || !hasFilePayload(event)) {
				return;
			}

			event.preventDefault();
			dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

			if (dragDepthRef.current === 0) {
				setIsDragging(false);
			}
		},
		[disabled],
	);

	const handleDrop = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			if (disabled) {
				return;
			}

			event.preventDefault();
			resetDragState();

			const files = collectDroppedFiles(event);

			if (files.length > 0) {
				onAddFiles(files);
			}
		},
		[disabled, onAddFiles, resetDragState],
	);

	return (
		<div
			className={cn('relative', className)}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			<div className="relative z-0 min-h-[inherit]">{children}</div>

			{isDragging ? (
				<div
					className={cn(
						'pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 backdrop-blur-[1px]',
						isDark
							? 'border-primary/70 bg-background/80 text-foreground'
							: 'border-primary/60 bg-background/85 text-foreground',
					)}
				>
					<div className="flex max-w-xs flex-col items-center gap-2 text-center">
						<Upload className="size-8 text-primary" />
						<p className="text-sm font-medium">{hint}</p>
						<p className="text-xs text-muted-foreground">Images, PDFs, and other reference files up to 8 MB</p>
					</div>
				</div>
			) : null}
		</div>
	);
}
