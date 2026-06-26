import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { DashboardLoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { useAuth } from './use-auth';

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (!auth.isAuthenticated) {
    return (
      <Navigate
        replace
        state={{ from: `${location.pathname}${location.search}` }}
        to="/login"
      />
    );
  }

  if (
    auth.user?.forcePasswordChange &&
    location.pathname !== '/replace-temporary-password'
  ) {
    return <Navigate replace to="/replace-temporary-password" />;
  }

  return <Outlet />;
}
