export type DastanPlan = 'free' | 'pro' | 'enterprise';

export interface Entitlements {
	canUseCloudSync(): boolean;
	canUseCloudAiMemory(): boolean;
	dailyAiPromptsRemaining(): number | 'unlimited';
	plan(): DastanPlan;
}

export const freeEntitlements: Entitlements = {
	canUseCloudSync: () => false,
	canUseCloudAiMemory: () => false,
	dailyAiPromptsRemaining: () => 50,
	plan: () => 'free',
};
