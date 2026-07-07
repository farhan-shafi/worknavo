import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AnalyticsRouteTracker } from '../components/shared/AnalyticsRouteTracker';
import { DashboardLoadingSkeleton } from '../components/shared/LoadingSkeleton';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { PlanGate } from '../features/billing/PlanGate';

const AppLayout = lazy(() =>
  import('../components/layout/AppLayout').then((module) => ({
    default: module.AppLayout,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import('../features/auth/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('../features/auth/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const LoginPage = lazy(() =>
  import('../features/auth/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import('../features/auth/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  })),
);
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const ClientsPage = lazy(() =>
  import('../features/clients/ClientsPage').then((module) => ({
    default: module.ClientsPage,
  })),
);
const ClientDetailPage = lazy(() =>
  import('../features/clients/ClientDetailPage').then((module) => ({
    default: module.ClientDetailPage,
  })),
);
const ProjectsPage = lazy(() =>
  import('../features/projects/ProjectsPage').then((module) => ({
    default: module.ProjectsPage,
  })),
);
const ProjectTeamsPage = lazy(() =>
  import('../features/projects/ProjectTeamsPage').then((module) => ({
    default: module.ProjectTeamsPage,
  })),
);
const InvoicesPage = lazy(() =>
  import('../features/invoices/InvoicesPage').then((module) => ({
    default: module.InvoicesPage,
  })),
);
const ExpensesPage = lazy(() =>
  import('../features/expenses/ExpensesPage').then((module) => ({
    default: module.ExpensesPage,
  })),
);
const ReportsPage = lazy(() =>
  import('../features/reports/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  })),
);
const WorkLogsPage = lazy(() =>
  import('../features/work-logs/WorkLogsPage').then((module) => ({
    default: module.WorkLogsPage,
  })),
);
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
);
const LandingPage = lazy(() =>
  import('../pages/LandingPage').then((module) => ({
    default: module.LandingPage,
  })),
);
const FeaturesPage = lazy(() =>
  import('../pages/MarketingPages').then((module) => ({
    default: module.FeaturesPage,
  })),
);
const PricingPage = lazy(() =>
  import('../pages/MarketingPages').then((module) => ({
    default: module.PricingPage,
  })),
);
const AboutPage = lazy(() =>
  import('../pages/MarketingPages').then((module) => ({
    default: module.AboutPage,
  })),
);
const TermsPage = lazy(() =>
  import('../pages/MarketingPages').then((module) => ({
    default: module.TermsPage,
  })),
);
const TeamPage = lazy(() =>
  import('../features/team/TeamPage').then((module) => ({
    default: module.TeamPage,
  })),
);
const AnalyticsPage = lazy(() =>
  import('../features/analytics/AnalyticsPage').then((module) => ({
    default: module.AnalyticsPage,
  })),
);
const AcceptInvitationPage = lazy(() =>
  import('../features/team/AcceptInvitationPage').then((module) => ({
    default: module.AcceptInvitationPage,
  })),
);
const ReplaceTemporaryPasswordPage = lazy(() =>
  import('../features/auth/ReplaceTemporaryPasswordPage').then((module) => ({
    default: module.ReplaceTemporaryPasswordPage,
  })),
);
const AuditPage = lazy(() =>
  import('../features/audit/AuditPage').then((module) => ({
    default: module.AuditPage,
  })),
);
const CategoriesPage = lazy(() =>
  import('../features/categories/CategoriesPage').then((module) => ({
    default: module.CategoriesPage,
  })),
);

export function App() {
  return (
    <>
      <AnalyticsRouteTracker />
      <Suspense fallback={<DashboardLoadingSkeleton />}>
        <Routes>
        <Route element={<LandingPage />} path="/" />
        <Route element={<FeaturesPage />} path="/features" />
        <Route element={<PricingPage />} path="/pricing" />
        <Route element={<AboutPage />} path="/about" />
        <Route element={<TermsPage />} path="/terms" />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RegisterPage />} path="/register" />
        <Route element={<ForgotPasswordPage />} path="/forgot-password" />
        <Route element={<ResetPasswordPage />} path="/reset-password" />
        <Route element={<AcceptInvitationPage />} path="/accept-invitation" />

        <Route element={<ProtectedRoute />}>
          <Route
            element={<ReplaceTemporaryPasswordPage />}
            path="/replace-temporary-password"
          />
          <Route element={<AppLayout />} path="/app">
            <Route element={<DashboardPage />} path="dashboard" />
            <Route element={<ClientsPage />} path="clients" />
            <Route element={<ClientDetailPage />} path="clients/:clientId" />
            <Route element={<ProjectsPage />} path="projects" />
            <Route element={<ProjectTeamsPage />} path="project-teams" />
            <Route element={<InvoicesPage />} path="invoices" />
            <Route
              element={
                <PlanGate feature="expenses">
                  <ExpensesPage />
                </PlanGate>
              }
              path="expenses"
            />
            <Route element={<ReportsPage />} path="reports" />
            <Route element={<WorkLogsPage />} path="work-logs" />
            <Route element={<TeamPage />} path="team" />
            <Route
              element={
                <PlanGate feature="teamAnalytics">
                  <AnalyticsPage />
                </PlanGate>
              }
              path="analytics"
            />
            <Route element={<AuditPage />} path="audit" />
            <Route element={<CategoriesPage />} path="categories" />
            <Route element={<SettingsPage />} path="settings" />
            <Route element={<Navigate replace to="/app/dashboard" />} index />
            <Route
              element={<Navigate replace to="/app/dashboard" />}
              path="*"
            />
          </Route>
        </Route>

        <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </Suspense>
    </>
  );
}
