import type { SyncService, SyncStatus } from '@dastan/plugin-api';

const localSyncStatus: SyncStatus = {
	enabled: false,
	lastSyncedAt: null,
	pendingChanges: 0,
};

export const localSyncService: SyncService = {
	status: () => localSyncStatus,
	async syncNow() {
		throw new Error('Cloud sync is not available yet. Your scripts are stored locally.');
	},
	onStatusChange() {
		return () => {};
	},
};
