export interface SyncStatus {
	enabled: boolean;
	lastSyncedAt: string | null;
	pendingChanges: number;
}

export interface SyncResult {
	pushed: number;
	pulled: number;
}

export interface SyncService {
	status(): SyncStatus;
	syncNow(): Promise<SyncResult>;
	pullNow(): Promise<SyncResult>;
	onStatusChange(callback: (status: SyncStatus) => void): () => void;
}
