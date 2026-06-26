import type { Permission } from '@clientflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BriefcaseBusiness,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  Tags,
  UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { authApi } from '../../features/auth/auth.api';
import { sessionQueryKey, useAuth } from '../../features/auth/use-auth';
import { cn } from '../../lib/utils';
import { request } from '../../lib/api-client';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const navigation: Array<{
  label: string;
  icon: LucideIcon;
  href: string;
  live: boolean;
  permission?: Permission;
  hideWhenPermission?: Permission;
}> = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    href: '/app/dashboard',
    live: true,
    permission: undefined,
  },
  {
    label: 'Team',
    icon: UsersRound,
    href: '/app/team',
    live: true,
    permission: 'members.view',
  },
  {
    label: 'Project Teams',
    icon: UserCheck,
    href: '/app/project-teams',
    live: true,
    permission: 'members.viewProject',
    hideWhenPermission: 'members.view',
  },
  {
    label: 'Clients',
    icon: UsersRound,
    href: '/app/clients',
    live: true,
    permission: 'clients.view',
  },
  {
    label: 'Projects',
    icon: BriefcaseBusiness,
    href: '/app/projects',
    live: true,
    permission: 'projects.view',
  },
  {
    label: 'My Work',
    icon: Clock3,
    href: '/app/work-logs',
    live: true,
    permission: 'worklogs.viewOwn',
  },
  {
    label: 'Reports',
    icon: FileText,
    href: '/app/reports',
    live: true,
    permission: 'reports.view',
  },
  {
    label: 'Invoices',
    icon: CircleDollarSign,
    href: '/app/invoices',
    live: true,
    permission: 'invoices.view',
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    href: '/app/analytics',
    live: true,
    permission: 'analytics.viewTeam',
  },
  {
    label: 'Audit log',
    icon: ShieldCheck,
    href: '/app/audit',
    live: true,
    permission: 'audit.view',
  },
  {
    label: 'Categories',
    icon: Tags,
    href: '/app/categories',
    live: true,
    permission: 'categories.manage',
  },
];

function WorkspaceMark() {
  return (
    <div className="inline-flex items-center gap-2.5">
      <span className="bg-foreground grid size-10 place-items-center rounded-xl text-white shadow-md shadow-slate-900/10">
        <Layers3 className="size-5" />
      </span>
      <span className="text-lg font-extrabold tracking-[-0.035em]">
        Client<span className="text-primary">Flow</span>
      </span>
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const auth = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notifications = useQuery({
    queryKey: ['notifications', auth.organization?.id],
    queryFn: () =>
      request<{
        unread: number;
        notifications: Array<{
          id: string;
          title: string;
          message: string;
          targetUrl: string | null;
          readAt: string | null;
          createdAt: string;
        }>;
      }>('/notifications'),
    enabled: auth.isAuthenticated,
    refetchInterval: 30_000,
  });
  const switchWorkspace = useMutation({
    mutationFn: authApi.switchOrganization,
    onSuccess: (session) => {
      queryClient.clear();
      queryClient.setQueryData(sessionQueryKey, session);
      navigate('/app/dashboard', { replace: true });
      toast.success(`Switched to ${session.organization.name}.`);
    },
  });
  const markAllRead = useMutation({
    mutationFn: () =>
      request<{ message: string }>('/notifications/read-all', {
        method: 'POST',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: ({ message }) => {
      queryClient.setQueryData(sessionQueryKey, null);
      queryClient.clear();
      toast.success(message);
      navigate('/login', { replace: true });
    },
    onError: () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  const announceComingSoon = (feature: string) => {
    setMobileOpen(false);
    toast.info(`${feature} is coming in a later build phase.`, {
      description: 'The navigation is ready for the module when it lands.',
    });
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] items-center justify-between">
        <WorkspaceMark />
        <Button
          aria-label="Close navigation"
          className="lg:hidden"
          onClick={() => setMobileOpen(false)}
          size="icon"
          variant="ghost"
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="mt-6 px-3">
        <p className="text-muted text-[10px] font-extrabold tracking-[0.16em] uppercase">
          Workspace
        </p>
      </div>
      <nav className="mt-2 space-y-1">
        {navigation
          .filter(
            ({ hideWhenPermission, permission }) =>
              (!permission || auth.permissions.includes(permission)) &&
              (!hideWhenPermission ||
                !auth.permissions.includes(hideWhenPermission)),
          )
          .map(({ href, icon: Icon, label, live }) =>
            live ? (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition',
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-orange-900/10'
                      : 'text-muted hover:bg-surface-strong hover:text-foreground',
                  )
                }
                key={label}
                onClick={() => setMobileOpen(false)}
                to={href}
              >
                <Icon className="size-[18px]" />
                {label}
              </NavLink>
            ) : (
              <button
                className="text-muted hover:bg-surface-strong hover:text-foreground flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition"
                key={label}
                onClick={() => announceComingSoon(label)}
                type="button"
              >
                <Icon className="size-[18px]" />
                <span className="flex-1">{label}</span>
                <Badge className="px-1.5 py-0.5 text-[9px]" variant="neutral">
                  Soon
                </Badge>
              </button>
            ),
          )}
      </nav>

      <div className="border-border mt-auto border-t pt-4">
        <NavLink
          className={({ isActive }) =>
            cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition',
              isActive
                ? 'bg-primary text-white shadow-lg shadow-orange-900/10'
                : 'text-muted hover:bg-surface-strong hover:text-foreground',
            )
          }
          onClick={() => setMobileOpen(false)}
          to="/app/settings"
        >
          <Settings className="size-[18px]" />
          Settings
        </NavLink>
        <ConfirmDialog
          confirmLabel="Log out"
          danger
          description="You will need to sign in again to return to your ClientFlow workspace."
          onConfirm={() => logout.mutate()}
          pending={logout.isPending}
          title="Log out of ClientFlow?"
          trigger={
            <button
              className="hover:bg-danger/5 hover:text-danger mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition"
              type="button"
            >
              <LogOut className="size-[18px]" />
              Log out
            </button>
          }
        />
      </div>
    </div>
  );

  return (
    <div className="bg-background min-h-screen">
      <aside className="border-border fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r bg-white px-5 pb-5 lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <>
          <button
            aria-label="Close navigation"
            className="bg-foreground/30 fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[290px] bg-white px-5 pb-5 shadow-2xl lg:hidden">
            {sidebar}
          </aside>
        </>
      ) : null}

      <div className="lg:pl-[260px]">
        <header className="border-border bg-background/90 sticky top-0 z-20 flex h-[72px] items-center border-b px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Button
            aria-label="Open navigation"
            className="mr-3 lg:hidden"
            onClick={() => setMobileOpen(true)}
            size="icon"
            variant="ghost"
          >
            <Menu className="size-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-extrabold">
                {auth.organization?.name ?? 'Your workspace'}
              </p>
              <Badge className="hidden sm:inline-flex" variant="success">
                <span className="bg-success size-1.5 rounded-full" />
                Secure
              </Badge>
            </div>
            <p className="text-muted truncate text-xs">
              {auth.membership?.role.replace('_', ' ')} · {auth.user?.email}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {auth.organizations.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Building2 className="size-4" />
                    <span className="hidden sm:inline">
                      {auth.organization?.name}
                    </span>
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {auth.organizations.map((organization) => (
                    <DropdownMenuItem
                      key={organization.id}
                      onSelect={() => switchWorkspace.mutate(organization.id)}
                    >
                      <Building2 className="size-4" />
                      <span className="flex-1">{organization.name}</span>
                      <span className="text-muted text-xs">
                        {organization.role.replace('_', ' ')}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Notifications"
                  className="relative"
                  size="icon"
                  variant="ghost"
                >
                  <Bell className="size-5" />
                  {(notifications.data?.unread ?? 0) > 0 ? (
                    <span className="bg-danger absolute top-1 right-1 grid min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold text-white">
                      {notifications.data?.unread}
                    </span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  Notifications
                  {(notifications.data?.unread ?? 0) > 0 ? (
                    <button
                      className="text-primary text-xs"
                      onClick={() => markAllRead.mutate()}
                      type="button"
                    >
                      Mark all read
                    </button>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.data?.notifications.length ? (
                  notifications.data.notifications.slice(0, 8).map((item) => (
                    <DropdownMenuItem
                      className="items-start"
                      key={item.id}
                      onSelect={() =>
                        item.targetUrl && navigate(item.targetUrl)
                      }
                    >
                      <span
                        className={cn(
                          'mt-1 size-2 shrink-0 rounded-full',
                          item.readAt ? 'bg-border' : 'bg-primary',
                        )}
                      />
                      <span>
                        <span className="block font-bold">{item.title}</span>
                        <span className="text-muted mt-0.5 block text-xs leading-5">
                          {item.message}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <p className="text-muted px-3 py-6 text-center text-sm">
                    No notifications yet.
                  </p>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hover:bg-surface-strong flex items-center gap-2 rounded-xl p-1.5 pr-2 transition outline-none"
                  type="button"
                >
                  <Avatar
                    name={auth.user?.name ?? 'ClientFlow'}
                    size="sm"
                    src={auth.user?.avatarUrl}
                  />
                  <div className="hidden text-left sm:block">
                    <p className="max-w-36 truncate text-sm font-bold">
                      {auth.user?.name}
                    </p>
                    <p className="text-muted text-[11px]">
                      {auth.membership?.role.replace('_', ' ')}
                    </p>
                  </div>
                  <ChevronDown className="text-muted hidden size-4 sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <p className="text-sm font-extrabold">{auth.user?.name}</p>
                  <p className="text-muted mt-0.5 max-w-48 truncate text-xs font-normal">
                    {auth.user?.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/app/settings')}>
                  <UserRound className="size-4" />
                  Profile settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-danger data-[highlighted]:bg-danger/5"
                  onSelect={() => logout.mutate()}
                >
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
