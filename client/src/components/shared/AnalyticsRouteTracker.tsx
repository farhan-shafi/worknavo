import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { trackPageView } from '../../lib/analytics';

export function AnalyticsRouteTracker() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}
