import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'dastan.pwa-install-dismissed';

export function PwaInstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (window.localStorage.getItem(DISMISS_KEY) === '1') {
			return;
		}

		const handleBeforeInstall = (event: Event) => {
			event.preventDefault();
			setDeferredPrompt(event as BeforeInstallPromptEvent);
			setVisible(true);
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstall);
		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
		};
	}, []);

	if (!visible || !deferredPrompt) {
		return null;
	}

	return (
		<div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border bg-background p-4 shadow-lg">
			<p className="text-sm font-medium">Install Dastan</p>
			<p className="mt-1 text-xs text-muted-foreground">Add Dastan to your home screen for faster access while you write offline.</p>
			<div className="mt-3 flex gap-2">
				<Button
					size="sm"
					type="button"
					onClick={() => {
						void (async () => {
							await deferredPrompt.prompt();
							await deferredPrompt.userChoice;
							setVisible(false);
							setDeferredPrompt(null);
						})();
					}}
				>
					Install
				</Button>
				<Button
					variant="outline"
					size="sm"
					type="button"
					onClick={() => {
						window.localStorage.setItem(DISMISS_KEY, '1');
						setVisible(false);
						setDeferredPrompt(null);
					}}
				>
					Not now
				</Button>
			</div>
		</div>
	);
}
