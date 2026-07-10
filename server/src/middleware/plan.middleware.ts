import type { NextFunction, Request, Response } from 'express';
import type { PlanFeature } from '@clientflow/shared';

import { planFeatureMinimumPlan, planIncludes } from '../auth/plans.js';
import { ApiError } from '../utils/api-error.js';

const planLabels = {
  free: 'Free',
  team: 'Team',
  pro: 'Pro',
};

export function requirePlanFeature(feature: PlanFeature) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const plan = request.organization?.subscriptionPlan ?? 'free';

    if (!planIncludes(plan, feature)) {
      const requiredPlan = planFeatureMinimumPlan[feature];
      next(
        new ApiError(
          402,
          `${planLabels[requiredPlan]} plan is required for this feature.`,
        ),
      );
      return;
    }

    next();
  };
}
