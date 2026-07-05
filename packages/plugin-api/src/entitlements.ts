export type DastanPlan = 'free' | 'pro' | 'enterprise';

export interface Entitlements {
	canUseCloudSync(): boolean;
	canUseCloudAiMemory(): boolean;
	canUsePlannerAi(): boolean;
	canUseEditorAi(): boolean;
	dailyAiPromptsRemaining(): number | 'unlimited';
	plan(): DastanPlan;
}

export const freeEntitlements: Entitlements = {
	canUseCloudSync: () => false,
	canUseCloudAiMemory: () => false,
	canUsePlannerAi: () => true,
	canUseEditorAi: () => false,
	dailyAiPromptsRemaining: () => 'unlimited',
	plan: () => 'free',
};
