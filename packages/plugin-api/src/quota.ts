export interface QuotaService {
	consumeAiPrompt(): Promise<boolean>;
	getRemainingAiPrompts(): number | 'unlimited';
	resetDailyQuota?(): void;
}
