import type { AuthService, AuthUser } from '@dastan/plugin-api';

const LOCAL_USER: AuthUser = {
	id: 'local',
	email: null,
	displayName: 'Local Writer',
};

export const localAuthService: AuthService = {
	getUser: () => LOCAL_USER,
	isSignedIn: () => false,
	async signIn() {
		throw new Error('Cloud sign-in is not available yet. Dastan works fully offline.');
	},
	async signOut() {
		// no-op for local-only mode
	},
	onAuthChange() {
		return () => {};
	},
};
