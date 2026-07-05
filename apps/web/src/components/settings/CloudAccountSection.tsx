import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDastanApp } from '../../context/DastanAppProvider';
import type { AuthUser } from '@dastan/plugin-api';
import { isCloudConfigured } from '../../utils/cloud-config';
import { LocalAccountBadge } from './LocalAccountBadge';

interface CloudAccountSectionProps {
	theme: {
		label: string;
		muted: string;
		surface: string;
	};
}

export function CloudAccountSection({ theme }: CloudAccountSectionProps) {
	const { auth, sync } = useDastanApp();
	const cloudConfigured = isCloudConfigured();
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
			setStatus('Signed out. You are back in local-only mode.');
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
			const result = await sync.syncNow();
			setStatus(`Backed up ${result.pushed} item(s) to the cloud.`);
		} catch (error) {
			setStatus(error instanceof Error ? error.message : 'Sync failed.');
		} finally {
			setBusy(false);
		}
	};

	const handlePull = async () => {
		setBusy(true);
		setStatus(null);

		try {
			const result = await sync.pullNow();
			setStatus(`Restored ${result.pulled} item(s) from the cloud.`);
		} catch (error) {
			setStatus(error instanceof Error ? error.message : 'Restore failed.');
		} finally {
			setBusy(false);
		}
	};

	const syncStatus = sync.status();
	const signedIn = auth.isSignedIn();

	return (
		<div className={`grid gap-4 p-4 ${theme.surface}`}>
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className={`text-sm font-medium ${theme.label}`}>Cloud account</p>
					<p className={`mt-1 text-xs ${theme.muted}`}>
						Sign in to back up scripts, restore on another device, and collaborate in real time.
					</p>
				</div>
				<LocalAccountBadge />
			</div>

			{!cloudConfigured ? (
				<div className={`rounded-lg border px-3 py-2 text-xs ${theme.muted}`}>
					Cloud is not configured in this build. Add `VITE_DASTAN_CLOUD_URL`, `VITE_SUPABASE_URL`, and
					`VITE_SUPABASE_PUBLISHABLE_KEY` to enable sign-in, backup, and collaboration.
				</div>
			) : null}

			{signedIn ? (
				<div className="grid gap-3">
					<p className={`text-sm ${theme.label}`}>
						Signed in as <span className="font-medium">{user?.displayName ?? user?.email}</span>
					</p>
					<div className="flex flex-wrap gap-2">
						<Button disabled={busy || !cloudConfigured} size="sm" type="button" variant="outline" onClick={() => void handleSync()}>
							Back up now
						</Button>
						<Button disabled={busy || !cloudConfigured} size="sm" type="button" variant="outline" onClick={() => void handlePull()}>
							Restore from cloud
						</Button>
						<Button disabled={busy} size="sm" type="button" variant="ghost" onClick={() => void handleSignOut()}>
							Sign out
						</Button>
					</div>
					<p className={`text-xs ${theme.muted}`}>
						{syncStatus.pendingChanges > 0
							? `${syncStatus.pendingChanges} local change(s) waiting to back up.`
							: syncStatus.lastSyncedAt
								? `Last sync: ${new Date(syncStatus.lastSyncedAt).toLocaleString()}`
								: 'No cloud backup yet.'}
					</p>
				</div>
			) : (
				<div className="grid gap-3">
					<p className={`text-xs ${theme.muted}`}>
						You're in local-only mode. Your scripts stay on this device until you sign in.
					</p>
					<Input
						disabled={!cloudConfigured || busy}
						placeholder="you@example.com"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
					<div className="flex flex-wrap gap-2">
						<Button disabled={!cloudConfigured || busy} size="sm" type="button" onClick={() => void handleMagicLink()}>
							Send magic link
						</Button>
						<Button disabled={!cloudConfigured || busy} size="sm" type="button" variant="outline" onClick={() => void handleGoogleSignIn()}>
							Continue with Google
						</Button>
					</div>
				</div>
			)}

			{status ? <p className={`text-xs ${theme.muted}`}>{status}</p> : null}
		</div>
	);
}
