import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDastanApp } from '../../context/DastanAppProvider';
import type { AuthUser } from '@dastan/plugin-api';

interface CloudAccountSectionProps {
	theme: {
		label: string;
		muted: string;
		surface: string;
	};
}

export function CloudAccountSection({ theme }: CloudAccountSectionProps) {
	const { auth, sync } = useDastanApp();
	const [user, setUser] = useState(auth.getUser());
	const [email, setEmail] = useState('');
	const [status, setStatus] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		return auth.onAuthChange((nextUser: AuthUser | null) => {
			setUser(nextUser);
		});
	}, [auth]);

	const handleMagicLink = async () => {
		const trimmed = email.trim();

		if (!trimmed) {
			setStatus('Enter your email to receive a sign-in link.');
			return;
		}

		setBusy(true);
		setStatus(null);

		try {
			const { setPendingSignInEmail } = await import('@dastan-cloud/bootstrap');
			setPendingSignInEmail(trimmed);
			await auth.signIn();
			setStatus('Check your email for a sign-in link.');
		} catch (error) {
			setStatus(error instanceof Error ? error.message : 'Unable to sign in.');
		} finally {
			setBusy(false);
		}
	};

	const handleGoogleSignIn = async () => {
		setBusy(true);
		setStatus(null);

		try {
			await auth.signIn();
		} catch (error) {
			setStatus(error instanceof Error ? error.message : 'Unable to sign in with Google.');
		} finally {
			setBusy(false);
		}
	};

	const handleSignOut = async () => {
		setBusy(true);

		try {
			await auth.signOut();
			setStatus('Signed out.');
		} catch (error) {
			setStatus(error instanceof Error ? error.message : 'Unable to sign out.');
		} finally {
			setBusy(false);
		}
	};

	const handleSync = async () => {
		setBusy(true);
		setStatus(null);

		try {
			await sync.syncNow();
			setStatus('Scripts backed up to the cloud.');
		} catch (error) {
			setStatus(error instanceof Error ? error.message : 'Sync failed.');
		} finally {
			setBusy(false);
		}
	};

	const syncStatus = sync.status();

	return (
		<div className={`grid gap-4 p-4 ${theme.surface}`}>
			<div>
				<p className={`text-sm font-medium ${theme.label}`}>Cloud account</p>
				<p className={`mt-1 text-xs ${theme.muted}`}>
					Sign in to back up scripts and collaborate in real time. Free while in beta.
				</p>
			</div>

			{user ? (
				<div className="grid gap-3">
					<p className={`text-sm ${theme.label}`}>
						Signed in as <span className="font-medium">{user.displayName ?? user.email}</span>
					</p>
					<div className="flex flex-wrap gap-2">
						<Button disabled={busy} size="sm" type="button" variant="outline" onClick={() => void handleSync()}>
							Back up now
						</Button>
						<Button disabled={busy} size="sm" type="button" variant="ghost" onClick={() => void handleSignOut()}>
							Sign out
						</Button>
					</div>
					<p className={`text-xs ${theme.muted}`}>
						{syncStatus.pendingChanges > 0
							? `${syncStatus.pendingChanges} local change(s) waiting to back up.`
							: syncStatus.lastSyncedAt
								? `Last backup: ${new Date(syncStatus.lastSyncedAt).toLocaleString()}`
								: 'No cloud backup yet.'}
					</p>
				</div>
			) : (
				<div className="grid gap-3">
					<Input
						placeholder="you@example.com"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
					<div className="flex flex-wrap gap-2">
						<Button disabled={busy} size="sm" type="button" onClick={() => void handleMagicLink()}>
							Send magic link
						</Button>
						<Button disabled={busy} size="sm" type="button" variant="outline" onClick={() => void handleGoogleSignIn()}>
							Continue with Google
						</Button>
					</div>
				</div>
			)}

			{status ? <p className={`text-xs ${theme.muted}`}>{status}</p> : null}
		</div>
	);
}
