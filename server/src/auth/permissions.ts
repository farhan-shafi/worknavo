import type { MembershipRole, Permission } from '@clientflow/shared';

export const allPermissions: Permission[] = [
  'members.view',
  'members.viewProject',
  'members.manage',
  'members.invite',
  'clients.view',
  'clients.manage',
  'projects.view',
  'projects.manage',
  'projects.assign',
  'categories.manage',
  'worklogs.createOwn',
  'worklogs.viewOwn',
  'worklogs.editOwn',
  'worklogs.viewProject',
  'worklogs.viewAll',
  'worklogs.manageAll',
  'reports.view',
  'reports.manage',
  'invoices.view',
  'invoices.manage',
  'financials.view',
  'analytics.viewTeam',
  'settings.manage',
  'audit.view',
];

const rolePermissions: Record<MembershipRole, Permission[]> = {
  owner: allPermissions,
  admin: allPermissions,
  project_manager: [
    'members.viewProject',
    'clients.view',
    'projects.view',
    'projects.manage',
    'worklogs.createOwn',
    'worklogs.viewOwn',
    'worklogs.editOwn',
    'worklogs.viewProject',
    'reports.view',
    'reports.manage',
    'analytics.viewTeam',
  ],
  finance: [
    'clients.view',
    'projects.view',
    'worklogs.viewAll',
    'reports.view',
    'invoices.view',
    'invoices.manage',
    'financials.view',
    'analytics.viewTeam',
  ],
  member: [
    'clients.view',
    'projects.view',
    'worklogs.createOwn',
    'worklogs.viewOwn',
    'worklogs.editOwn',
    'reports.view',
  ],
  viewer: ['clients.view', 'projects.view', 'reports.view'],
};

export function resolvePermissions(
  role: MembershipRole,
  overrides?: { allow?: Permission[]; deny?: Permission[] },
) {
  if (role === 'owner') {
    return [...allPermissions];
  }

  const permissions = new Set(rolePermissions[role]);
  for (const permission of overrides?.allow ?? []) permissions.add(permission);
  for (const permission of overrides?.deny ?? [])
    permissions.delete(permission);
  return [...permissions];
}
