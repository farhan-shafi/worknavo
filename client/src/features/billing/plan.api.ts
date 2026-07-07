import type { PlanSelectionResponse, SubscriptionPlan } from '@clientflow/shared';

import { request } from '../../lib/api-client';

export const planApi = {
  select: (subscriptionPlan: SubscriptionPlan) =>
    request<PlanSelectionResponse>('/organizations/current/plan', {
      method: 'PATCH',
      body: JSON.stringify({ subscriptionPlan }),
    }),
};
