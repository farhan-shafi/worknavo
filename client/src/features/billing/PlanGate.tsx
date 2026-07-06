import {
  planFeatureMinimumPlan,
  planIncludes,
  type PlanFeature,
} from '@clientflow/shared';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../auth/use-auth';

export function PlanGate({
  children,
  feature,
}: {
  children: ReactNode;
  feature: PlanFeature;
}) {
  const { organization } = useAuth();

  if (!planIncludes(organization?.subscriptionPlan, feature)) {
    return (
      <Navigate
        replace
        to={`/app/settings?upgrade=${feature}&requiredPlan=${planFeatureMinimumPlan[feature]}`}
      />
    );
  }

  return children;
}
