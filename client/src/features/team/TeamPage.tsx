import type { MembershipRole, Permission, Project } from '@clientflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, UserPlus, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '../../components/shared/EmptyState';
import { PageHeader } from '../../components/shared/PageHeader';
import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { ApiError, request } from '../../lib/api-client';
import { useAuth } from '../auth/use-auth';
import { teamApi, type TeamMember } from './team.api';

const roles: Array<Exclude<MembershipRole, 'owner'>> = [
  'admin',
  'project_manager',
  'finance',
  'member',
  'viewer',
];

function roleLabel(role: MembershipRole) {
  return role
    .replace('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function TeamPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Exclude<MembershipRole, 'owner'>>('member');
  const [mode, setMode] = useState<'email' | 'admin_created'>('email');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const projects = useQuery({
    queryKey: ['projects', 'team-assignment', auth.organization?.id],
    queryFn: () => request<{ projects: Project[] }>('/projects?status=all'),
    enabled: auth.permissions.includes('projects.assign'),
  });
  const categories = useQuery({
    queryKey: ['categories', auth.organization?.id],
    queryFn: () =>
      request<{
        categories: Array<{ id: string; name: string; active: boolean }>;
      }>('/categories'),
    enabled: auth.permissions.includes('projects.assign'),
  });
  const members = useQuery({
    queryKey: ['members', auth.organization?.id],
    queryFn: teamApi.list,
    enabled: auth.permissions.includes('members.view'),
  });
  const invitations = useQuery({
    queryKey: ['invitations', auth.organization?.id],
    queryFn: teamApi.invitations,
    enabled: auth.permissions.includes('members.invite'),
  });
  const invite = useMutation({
    mutationFn: teamApi.invite,
    onSuccess: (result) => {
      toast.success(result.message, {
        description:
          result.temporaryPassword ??
          result.invitation?.acceptUrl ??
          'The invitation is ready.',
        duration: 12_000,
      });
      setOpen(false);
      setEmail('');
      setName('');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : 'Could not add the member.',
      ),
  });
  const changeStatus = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: 'active' | 'suspended';
    }) => (status === 'active' ? teamApi.suspend(id) : teamApi.reactivate(id)),
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
  const invitationAction = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: 'resend' | 'revoke';
    }) =>
      action === 'resend'
        ? teamApi.resendInvitation(id)
        : teamApi.revokeInvitation(id),
    onSuccess: (result) => {
      const acceptUrl =
        'acceptUrl' in result ? String(result.acceptUrl) : undefined;
      const delivered =
        'delivered' in result ? Boolean(result.delivered) : true;
      toast.success(result.message, {
        description: acceptUrl && !delivered ? acceptUrl : undefined,
        duration: 12_000,
      });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          auth.permissions.includes('members.invite') ? (
            <Dialog onOpenChange={setOpen} open={open}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="size-4" />
                  Add member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a team member</DialogTitle>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    invite.mutate({
                      email,
                      name: name || undefined,
                      role,
                      mode,
                      projectIds: [],
                      permissionOverrides: { allow: [], deny: [] },
                    });
                  }}
                >
                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Email
                    </label>
                    <Input
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                  {mode === 'admin_created' ? (
                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Name
                      </label>
                      <Input
                        onChange={(event) => setName(event.target.value)}
                        value={name}
                      />
                    </div>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Role
                      </label>
                      <Select
                        onChange={(event) =>
                          setRole(
                            event.target.value as Exclude<
                              MembershipRole,
                              'owner'
                            >,
                          )
                        }
                        value={role}
                      >
                        {roles.map((item) => (
                          <option key={item} value={item}>
                            {roleLabel(item)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Onboarding
                      </label>
                      <Select
                        onChange={(event) =>
                          setMode(
                            event.target.value as 'email' | 'admin_created',
                          )
                        }
                        value={mode}
                      >
                        <option value="email">Invite link</option>
                        <option value="admin_created">
                          Temporary password
                        </option>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full" disabled={invite.isPending}>
                    {invite.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}
                    Add member
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
        description="Invite people, assign operational roles, and control workspace access."
        eyebrow={auth.organization?.name ?? 'Workspace'}
        title="Team"
      />

      {members.data?.members.length ? (
        <div className="border-border overflow-hidden rounded-2xl border bg-white">
          {members.data.members.map((member) => (
            <div
              className="border-border flex flex-col gap-4 border-b p-5 last:border-b-0 sm:flex-row sm:items-center"
              key={member.id}
            >
              <Avatar name={member.name} src={member.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{member.name}</p>
                <p className="text-muted truncate text-sm">
                  {member.email}
                  {member.jobTitle ? ` · ${member.jobTitle}` : ''}
                </p>
              </div>
              <Badge
                variant={member.status === 'active' ? 'success' : 'neutral'}
              >
                {member.status}
              </Badge>
              <Badge variant="neutral">{roleLabel(member.role)}</Badge>
              {auth.permissions.includes('members.manage') &&
              member.role !== 'owner' ? (
                <>
                  <Button
                    onClick={() => setEditingMember(member)}
                    size="sm"
                    variant="outline"
                  >
                    Manage
                  </Button>
                  <Button
                    onClick={() =>
                      changeStatus.mutate({
                        id: member.id,
                        status: member.status,
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    {member.status === 'active' ? 'Suspend' : 'Reactivate'}
                  </Button>
                </>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Invite your first teammate when you are ready to share projects and time tracking."
          icon={UsersRound}
          title="No team members yet"
        />
      )}
      {invitations.data?.invitations.some(
        (invitation) => invitation.status === 'pending',
      ) ? (
        <section className="border-border rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-extrabold">Pending invitations</h2>
          <div className="mt-4 space-y-3">
            {invitations.data.invitations
              .filter((invitation) => invitation.status === 'pending')
              .map((invitation) => (
                <div
                  className="bg-surface flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center"
                  key={invitation.id}
                >
                  <div className="flex-1">
                    <p className="font-bold">{invitation.email}</p>
                    <p className="text-muted text-xs">
                      {roleLabel(invitation.role)} · expires{' '}
                      {invitation.expiresAt
                        ? new Date(invitation.expiresAt).toLocaleDateString()
                        : 'soon'}
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      invitationAction.mutate({
                        id: invitation.id,
                        action: 'resend',
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    Resend
                  </Button>
                  <Button
                    onClick={() =>
                      invitationAction.mutate({
                        id: invitation.id,
                        action: 'revoke',
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    Revoke
                  </Button>
                </div>
              ))}
          </div>
        </section>
      ) : null}
      <MemberEditor
        categories={categories.data?.categories ?? []}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        projects={projects.data?.projects ?? []}
      />
    </div>
  );
}

const permissionOptions: Permission[] = [
  'members.view',
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

function MemberEditor({
  categories,
  member,
  onClose,
  projects,
}: {
  categories: Array<{ id: string; name: string; active: boolean }>;
  member: TeamMember | null;
  onClose: () => void;
  projects: Project[];
}) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<Exclude<MembershipRole, 'owner'>>('member');
  const [jobTitle, setJobTitle] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [allow, setAllow] = useState<Permission[]>([]);
  const [deny, setDeny] = useState<Permission[]>([]);

  useEffect(() => {
    if (!member) return;
    setRole(member.role === 'owner' ? 'admin' : member.role);
    setJobTitle(member.jobTitle ?? '');
    setCapacity(String(member.weeklyCapacity));
    setProjectIds(member.projectIds);
    setCategoryIds([
      ...new Set(
        member.assignments.flatMap((assignment) => assignment.categoryIds),
      ),
    ]);
    setAllow(member.permissionOverrides.allow);
    setDeny(member.permissionOverrides.deny);
  }, [member]);

  const save = useMutation({
    mutationFn: async () => {
      if (!member) return;
      await teamApi.update(member.id, {
        role,
        jobTitle: jobTitle || null,
        weeklyCapacity: Number(capacity),
        permissionOverrides: { allow, deny },
      });
      await teamApi.assignProjects(
        member.id,
        projectIds.map((projectId) => ({
          projectId,
          assignmentType:
            role === 'project_manager' ? 'project_manager' : 'contributor',
          categoryIds,
        })),
      );
    },
    onSuccess: () => {
      toast.success('Member access updated.');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Could not update member access.',
      ),
  });

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(member)}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage {member?.name}</DialogTitle>
        </DialogHeader>
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-bold">Role</label>
              <Select
                onChange={(event) =>
                  setRole(
                    event.target.value as Exclude<MembershipRole, 'owner'>,
                  )
                }
                value={role}
              >
                {roles.map((item) => (
                  <option key={item} value={item}>
                    {roleLabel(item)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">Job title</label>
              <Input
                onChange={(event) => setJobTitle(event.target.value)}
                value={jobTitle}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">
                Weekly capacity
              </label>
              <Input
                max={168}
                min={1}
                onChange={(event) => setCapacity(event.target.value)}
                type="number"
                value={capacity}
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">Assigned projects</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {projects.map((project) => (
                <label
                  className="border-border flex items-center gap-3 rounded-xl border p-3 text-sm"
                  key={project.id}
                >
                  <input
                    checked={projectIds.includes(project.id)}
                    className="accent-primary"
                    onChange={(event) =>
                      setProjectIds((current) =>
                        event.target.checked
                          ? [...current, project.id]
                          : current.filter((id) => id !== project.id),
                      )
                    }
                    type="checkbox"
                  />
                  {project.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">Allowed categories</p>
            <p className="text-muted mt-1 text-xs">
              These restrictions apply to each selected project. Leave empty to
              use the project’s full category list.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {categories
                .filter((category) => category.active)
                .map((category) => (
                  <label
                    className="border-border flex items-center gap-3 rounded-xl border p-3 text-sm"
                    key={category.id}
                  >
                    <input
                      checked={categoryIds.includes(category.id)}
                      className="accent-primary"
                      onChange={(event) =>
                        setCategoryIds((current) =>
                          event.target.checked
                            ? [...current, category.id]
                            : current.filter((id) => id !== category.id),
                        )
                      }
                      type="checkbox"
                    />
                    {category.name}
                  </label>
                ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">Permission overrides</p>
            <p className="text-muted mt-1 text-xs">
              Explicit deny wins. Owner permissions cannot be restricted.
            </p>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {permissionOptions.map((permission) => (
                <div
                  className="border-border grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border px-3 py-2"
                  key={permission}
                >
                  <span className="text-xs font-semibold">{permission}</span>
                  <label className="text-success flex items-center gap-1 text-xs">
                    <input
                      checked={allow.includes(permission)}
                      className="accent-success"
                      onChange={(event) => {
                        setAllow((current) =>
                          event.target.checked
                            ? [...current, permission]
                            : current.filter((item) => item !== permission),
                        );
                        if (event.target.checked) {
                          setDeny((current) =>
                            current.filter((item) => item !== permission),
                          );
                        }
                      }}
                      type="checkbox"
                    />
                    Allow
                  </label>
                  <label className="text-danger flex items-center gap-1 text-xs">
                    <input
                      checked={deny.includes(permission)}
                      className="accent-danger"
                      onChange={(event) => {
                        setDeny((current) =>
                          event.target.checked
                            ? [...current, permission]
                            : current.filter((item) => item !== permission),
                        );
                        if (event.target.checked) {
                          setAllow((current) =>
                            current.filter((item) => item !== permission),
                          );
                        }
                      }}
                      type="checkbox"
                    />
                    Deny
                  </label>
                </div>
              ))}
            </div>
          </div>
          <Button
            className="w-full"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            Save member access
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
