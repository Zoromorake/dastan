export type UserRole = 'user' | 'beta' | 'admin';

export interface AuthUser {
	id: string;
	email: string | null;
	displayName: string | null;
	role?: UserRole;
	betaFeatures?: string[];
	isLocalOnly?: boolean;
}

export interface AuthService {
	getUser(): AuthUser | null;
	isSignedIn(): boolean;
	isLocalOnly(): boolean;
	getAccessToken?(): Promise<string | null>;
	signIn(): Promise<void>;
	signOut(): Promise<void>;
	onAuthChange(callback: (user: AuthUser | null) => void): () => void;
}
