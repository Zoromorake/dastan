import type { QuotaService } from '@dastan/plugin-api';

const QUOTA_STORAGE_KEY = 'dastan.ai-quota.v1';
const DAILY_FREE_PROMPTS = 50;

interface QuotaRecord {
	date: string;
	used: number;
}

function todayKey(): string {
	return new Date().toISOString().slice(0, 10);
}

function readQuota(): QuotaRecord {
	if (typeof window === 'undefined') {
		return { date: todayKey(), used: 0 };
	}

	const raw = window.localStorage.getItem(QUOTA_STORAGE_KEY);

	if (!raw) {
		return { date: todayKey(), used: 0 };
	}

	try {
		const parsed = JSON.parse(raw) as QuotaRecord;
		if (parsed.date !== todayKey()) {
			return { date: todayKey(), used: 0 };
		}
		return parsed;
	} catch {
		return { date: todayKey(), used: 0 };
	}
}

function writeQuota(record: QuotaRecord): void {
	if (typeof window === 'undefined') {
		return;
	}
	window.localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(record));
}

export const localQuotaService: QuotaService = {
	getRemainingAiPrompts() {
		const record = readQuota();
		return Math.max(0, DAILY_FREE_PROMPTS - record.used);
	},
	async consumeAiPrompt() {
		const record = readQuota();
		if (record.used >= DAILY_FREE_PROMPTS) {
			return false;
		}
		writeQuota({ date: todayKey(), used: record.used + 1 });
		return true;
	},
	resetDailyQuota() {
		writeQuota({ date: todayKey(), used: 0 });
	},
};
