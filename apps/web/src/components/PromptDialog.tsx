import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface PromptDialogProps {
	open: boolean;
	title: string;
	description?: string;
	label?: string;
	defaultValue?: string;
	confirmLabel?: string;
	onConfirm: (value: string) => void;
	onCancel: () => void;
}

export function PromptDialog({
	open,
	title,
	description,
	label = 'Name',
	defaultValue = '',
	confirmLabel = 'Save',
	onConfirm,
	onCancel,
}: PromptDialogProps) {
	const [value, setValue] = useState(defaultValue);

	useEffect(() => {
		if (open) {
			setValue(defaultValue);
		}
	}, [defaultValue, open]);

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onCancel();
				}
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description ? <DialogDescription>{description}</DialogDescription> : null}
				</DialogHeader>
				<label className="grid gap-2 text-sm">
					<span className="text-muted-foreground">{label}</span>
					<Input
						autoFocus
						value={value}
						onChange={(event) => setValue(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								onConfirm(value.trim());
							}
						}}
					/>
				</label>
				<DialogFooter>
					<Button variant="outline" type="button" onClick={onCancel}>
						Cancel
					</Button>
					<Button type="button" onClick={() => onConfirm(value.trim())}>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
