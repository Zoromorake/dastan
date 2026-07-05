import { useDastanApp } from '../../context/DastanAppProvider';

interface LocalAccountBadgeProps {
	className?: string;
}

export function LocalAccountBadge({ className = '' }: LocalAccountBadgeProps) {
	const { auth } = useDastanApp();
	const signedIn = auth.isSignedIn();

	return (
		<span
			className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
				signedIn
					? 'border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300'
					: 'border-stone-300/80 bg-stone-100 text-stone-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
			} ${className}`}
		>
			{signedIn ? 'Cloud connected' : 'Local only'}
		</span>
	);
}
