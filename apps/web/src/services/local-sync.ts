import type { SyncService, SyncStatus } from '@dastan/plugin-api';

const localSyncStatus: SyncStatus = {
	enabled: false,
	lastSyncedAt: null,
	pendingChanges: 0,
};

export const localSyncService: SyncService = {
	status: () => localSyncStatus,
	async syncNow() {
		throw new Error('Cloud sync is not configured in this build. Set cloud environment variables to enable backup and restore.');
	},
	async pullNow() {
		throw new Error('Cloud restore is not configured in this build. Set cloud environment variables to enable backup and restore.');
	},
	onStatusChange() {
		return () => {};
	},
};
