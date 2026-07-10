import type { PlanFeature, SubscriptionPlan } from '@clientflow/shared';

export const subscriptionPlanRank: Record<SubscriptionPlan, number> = {
  free: 0,
  team: 1,
  pro: 2,
};

export const planFeatureMinimumPlan: Record<PlanFeature, SubscriptionPlan> = {
  teamAnalytics: 'team',
  workLogRules: 'team',
  expenses: 'pro',
  scheduledReports: 'pro',
  proofTracking: 'pro',
};

export function planIncludes(
  plan: SubscriptionPlan | null | undefined,
  feature: PlanFeature,
) {
  const currentPlan = plan ?? 'free';
  return (
    subscriptionPlanRank[currentPlan] >=
    subscriptionPlanRank[planFeatureMinimumPlan[feature]]
  );
}
