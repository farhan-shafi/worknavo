import {
  planFeatureMinimumPlan,
  planIncludes,
  type PlanFeature,
} from '@clientflow/shared';
import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { lockedFeatureProperties, trackEvent } from '../../lib/analytics';
import { useAuth } from '../auth/use-auth';

export function PlanGate({
  children,
  feature,
}: {
  children: ReactNode;
  feature: PlanFeature;
}) {
  const { organization } = useAuth();
  const requiredPlan = planFeatureMinimumPlan[feature];
  const locked = !planIncludes(organization?.subscriptionPlan, feature);

  useEffect(() => {
    if (locked) {
      trackEvent(
        'feature_locked_clicked',
        lockedFeatureProperties(feature, requiredPlan),
      );
    }
  }, [feature, locked, requiredPlan]);

  if (locked) {
    return (
      <Navigate
        replace
        to={`/app/settings?upgrade=${feature}&requiredPlan=${requiredPlan}`}
      />
    );
  }

  return children;
}
