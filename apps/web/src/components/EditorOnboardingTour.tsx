import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getEditorTheme } from '../utils/editor-theme';
import { setHasSeenTour } from '../utils/first-run';

const TOUR_STEPS = [
	{
		title: 'Tab & Enter flow',
		body: 'Press Tab to cycle element types and Enter to split blocks — scene heading, action, character, dialogue.',
	},
	{
		title: 'SmartType',
		body: 'Start typing a character or location name and accept suggestions to stay consistent.',
	},
	{
		title: 'Navigator',
		body: 'Use the left navigator to jump between scenes and preview structure beats.',
	},
	{
		title: 'Beat board',
		body: 'Switch to Develop → Beat Board to map story beats alongside your draft.',
	},
	{
		title: 'AI panel',
		body: 'Open Chat to ask questions, plan structure, or edit with your own API key.',
	},
] as const;

interface EditorOnboardingTourProps {
	open: boolean;
	resolvedTheme: 'light' | 'dark';
	onClose: () => void;
}

export function EditorOnboardingTour({ open, resolvedTheme, onClose }: EditorOnboardingTourProps) {
	const isDark = resolvedTheme === 'dark';
	const theme = getEditorTheme(isDark);
	const [step, setStep] = useState(0);

	useEffect(() => {
		if (open) {
			setStep(0);
		}
	}, [open]);

	if (!open) {
		return null;
	}

	const current = TOUR_STEPS[step];
	const isLast = step === TOUR_STEPS.length - 1;

	return (
		<div className="pointer-events-none fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
			<div className={`pointer-events-auto w-full max-w-md rounded-2xl border p-5 shadow-2xl ${theme.surface} ${theme.border}`}>
				<p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${theme.statusText}`}>
					Step {step + 1} of {TOUR_STEPS.length}
				</p>
				<h2 className="mt-2 text-lg font-semibold">{current.title}</h2>
				<p className={`mt-2 text-sm leading-relaxed ${theme.statusText}`}>{current.body}</p>
				<div className="mt-5 flex items-center justify-between gap-3">
					<Button
						type="button"
						variant="ghost"
						onClick={() => {
							setHasSeenTour(true);
							onClose();
						}}
					>
						Skip tour
					</Button>
					<div className="flex gap-2">
						{step > 0 ? (
							<Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)}>
								Back
							</Button>
						) : null}
						<Button
							type="button"
							onClick={() => {
								if (isLast) {
									setHasSeenTour(true);
									onClose();
									return;
								}

								setStep((value) => value + 1);
							}}
						>
							{isLast ? 'Start writing' : 'Next'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
