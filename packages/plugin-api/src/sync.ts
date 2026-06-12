export interface SyncStatus {
	enabled: boolean;
	lastSyncedAt: string | null;
	pendingChanges: number;
}

export interface SyncService {
	status(): SyncStatus;
	syncNow(): Promise<void>;
	onStatusChange(callback: (status: SyncStatus) => void): () => void;
}
