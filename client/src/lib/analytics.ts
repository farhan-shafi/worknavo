import type {
  AuthUser,
  Membership,
  Organization,
  PlanFeature,
  SubscriptionPlan,
} from '@clientflow/shared';
import posthog from 'posthog-js';

type AnalyticsProperties = Record<
  string,
  boolean | number | string | null | undefined
>;

let initialized = false;

const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const posthogHost =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  'https://us.i.posthog.com';
const disabled =
  (import.meta.env.VITE_POSTHOG_DISABLED as string | undefined) === 'true';

export function analyticsEnabled() {
  return Boolean(posthogKey) && !disabled;
}

function safeProperties(properties: AnalyticsProperties = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  );
}

export function initAnalytics() {
  if (initialized || !analyticsEnabled()) return;

  posthog.init(posthogKey!, {
    api_host: posthogHost,
    autocapture: false,
    capture_pageview: false,
    defaults: '2026-05-30',
    disable_session_recording: true,
    loaded: (instance) => {
      if (import.meta.env.DEV) {
        instance.debug(false);
      }
    },
  });
  initialized = true;
}

export function trackEvent(
  eventName: string,
  properties: AnalyticsProperties = {},
) {
  if (!analyticsEnabled()) return;
  initAnalytics();
  posthog.capture(eventName, safeProperties(properties));
}

export function trackPageView(pathname: string) {
  trackEvent('page_view', {
    path: pathname,
    url: `${window.location.origin}${pathname}`,
  });
}

export function identifyUser(input: {
  user: AuthUser;
  organization: Organization;
  membership: Membership;
}) {
  if (!analyticsEnabled()) return;
  initAnalytics();

  const userProperties = {
    role: input.membership.role,
    organization_id: input.organization.id,
    workspace_type: input.organization.workspaceType,
    subscription_plan: input.organization.subscriptionPlan,
  };

  posthog.identify(input.user.id, userProperties);
  posthog.group('organization', input.organization.id, {
    workspace_type: input.organization.workspaceType,
    subscription_plan: input.organization.subscriptionPlan,
  });
}

export function resetAnalytics() {
  if (!analyticsEnabled()) return;
  posthog.reset();
}

export function planProperties(
  plan: SubscriptionPlan,
  previousPlan?: SubscriptionPlan,
) {
  return {
    plan,
    previous_plan: previousPlan,
  };
}

export function lockedFeatureProperties(
  feature: PlanFeature,
  requiredPlan: SubscriptionPlan,
) {
  return {
    feature,
    required_plan: requiredPlan,
  };
}
