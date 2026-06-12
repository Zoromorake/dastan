export interface AuthUser {
	id: string;
	email: string | null;
	displayName: string | null;
}

export interface AuthService {
	getUser(): AuthUser | null;
	isSignedIn(): boolean;
	signIn(): Promise<void>;
	signOut(): Promise<void>;
	onAuthChange(callback: (user: AuthUser | null) => void): () => void;
}
