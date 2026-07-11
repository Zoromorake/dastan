import { hasAcknowledgedLocalOnlyMode } from './local-identity';

const BACKUP_NUDGE_KEY = 'dastan.backup-nudge.v1';
const NUDGE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

interface BackupNudgeState {
	firstSeenAt?: string;
	lastDismissedAt?: string;
	lastExportAt?: string;
}

function readState(): BackupNudgeState {
	try {
		const raw = localStorage.getItem(BACKUP_NUDGE_KEY);

		if (!raw) {
			return {};
		}

		return JSON.parse(raw) as BackupNudgeState;
	} catch {
		return {};
	}
}

function writeState(next: BackupNudgeState): void {
	try {
		localStorage.setItem(BACKUP_NUDGE_KEY, JSON.stringify(next));
	} catch {
		// ignore
	}
}

export function recordBackupExport(): void {
	const current = readState();
	writeState({ ...current, lastExportAt: new Date().toISOString() });
}

export function dismissBackupNudge(): void {
	const current = readState();
	writeState({ ...current, lastDismissedAt: new Date().toISOString() });
}

export function shouldShowBackupNudge(hasDocuments: boolean): boolean {
	if (!hasDocuments || typeof window === 'undefined' || !hasAcknowledgedLocalOnlyMode()) {
		return false;
	}

	const state = readState();
	const now = Date.now();

	if (!state.firstSeenAt) {
		writeState({ ...state, firstSeenAt: new Date().toISOString() });
		return false;
	}

	const anchors = [
		Date.parse(state.firstSeenAt),
		state.lastDismissedAt ? Date.parse(state.lastDismissedAt) : 0,
		state.lastExportAt ? Date.parse(state.lastExportAt) : 0,
	].filter((value) => Number.isFinite(value) && value > 0);

	const latest = Math.max(...anchors);
	return now - latest >= NUDGE_INTERVAL_MS;
}
