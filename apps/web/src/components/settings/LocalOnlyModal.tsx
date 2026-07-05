import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { acknowledgeLocalOnlyMode } from '../../utils/local-identity';

interface LocalOnlyModalProps {
	open: boolean;
	onClose: () => void;
}

export function LocalOnlyModal({ open, onClose }: LocalOnlyModalProps) {
	const [acknowledged, setAcknowledged] = useState(false);

	if (!open) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
			<section
				className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
				role="dialog"
				aria-modal="true"
				aria-label="Local-only mode"
			>
				<h2 className="text-xl font-semibold text-stone-900 dark:text-slate-100">You're writing locally</h2>
				<p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
					Dastan works fully offline. Your scripts stay on this device until you choose to connect a cloud account.
				</p>

				<ul className="mt-4 grid gap-2 text-sm text-stone-700 dark:text-slate-300">
					<li>• No account required to start writing</li>
					<li>• Data is stored in this browser's local storage</li>
					<li>• Export scripts regularly to back up your work</li>
					<li>• Sign in to a cloud account anytime to sync and collaborate</li>
				</ul>

				<label className="mt-5 flex items-start gap-2 text-sm text-stone-700 dark:text-slate-300">
					<input
						checked={acknowledged}
						className="mt-0.5"
						type="checkbox"
						onChange={(event) => setAcknowledged(event.target.checked)}
					/>
					<span>I understand this device is the only copy of my work until I back up or sync.</span>
				</label>

				<div className="mt-6 flex justify-end gap-2">
					<Button
						type="button"
						onClick={() => {
							if (!acknowledged) {
								return;
							}

							acknowledgeLocalOnlyMode();
							onClose();
						}}
						disabled={!acknowledged}
					>
						Continue locally
					</Button>
				</div>
			</section>
		</div>
	);
}
