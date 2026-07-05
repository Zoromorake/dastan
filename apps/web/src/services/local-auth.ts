import type { AuthService, AuthUser } from '@dastan/plugin-api';
import { getLocalDeviceId } from '../utils/local-identity';
import { loadPenName } from '../utils/hub-utils';

function buildLocalUser(): AuthUser {
	return {
		id: getLocalDeviceId(),
		email: null,
		displayName: loadPenName().trim() || 'Local Writer',
		role: 'user',
		isLocalOnly: true,
	};
}

export const localAuthService: AuthService = {
	getUser() {
		return buildLocalUser();
	},
	isSignedIn() {
		return false;
	},
	isLocalOnly() {
		return true;
	},
	async getAccessToken() {
		return null;
	},
	async signIn() {
		throw new Error('Cloud sign-in is not configured in this build. Set VITE_DASTAN_CLOUD_URL, VITE_SUPABASE_URL, and VITE_SUPABASE_PUBLISHABLE_KEY to enable cloud accounts.');
	},
	async signOut() {
		// no-op for local-only mode
	},
	onAuthChange() {
		return () => {};
	},
};
