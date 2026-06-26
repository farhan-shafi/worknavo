import type { MembershipRole } from '@clientflow/shared';
import { BriefcaseBusiness, ShieldCheck, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { PageHeader } from '../../components/shared/PageHeader';
import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../auth/use-auth';
import { useProjectTeam, useProjects } from './project.queries';

function roleLabel(role: MembershipRole) {
  return role
    .replace('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ProjectTeamsPage() {
  const auth = useAuth();
  const canViewProjectTeam = auth.permissions.includes('members.viewProject');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const projects = useProjects({ clientId: '', search: '', status: 'all' });
  const projectTeam = useProjectTeam(selectedProjectId, canViewProjectTeam);
  const visibleProjects = projects.data?.projects;
  const projectOptions = visibleProjects ?? [];
  const selectedProject = projectOptions.find(
    (project) => project.id === selectedProjectId,
  );

  useEffect(() => {
    if (selectedProjectId || !visibleProjects?.length) return;
    const firstProject = visibleProjects[0];
    if (firstProject) setSelectedProjectId(firstProject.id);
  }, [selectedProjectId, visibleProjects]);

  if (!canViewProjectTeam) {
    return (
      <EmptyState
        description="Project team visibility is available only for scoped managers and admins."
        icon={ShieldCheck}
        title="Project team access is restricted"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="View the people assigned to projects you are allowed to manage, without exposing the full workspace directory."
        eyebrow={auth.organization?.name ?? 'Workspace'}
        title="Project Teams"
      />

      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="text-sm font-extrabold">Select project</p>
            <p className="text-muted mt-1 text-sm">
              Project Managers only see projects where they are assigned as a
              manager.
            </p>
          </div>
          <Select
            aria-label="Select project team"
            disabled={projects.isLoading || projectOptions.length === 0}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            value={selectedProjectId}
          >
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {projects.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton className="h-24 w-full rounded-2xl" key={index} />
          ))}
        </div>
      ) : null}

      {!projects.isLoading && projectOptions.length === 0 ? (
        <EmptyState
          description="Once a project is assigned to you as Project Manager, its team will appear here."
          icon={BriefcaseBusiness}
          title="No managed projects yet"
        />
      ) : null}

      {projectTeam.isError ? (
        <ErrorState
          description="The selected project team could not be loaded."
          onRetry={() => {
            void projectTeam.refetch();
          }}
        />
      ) : null}

      {selectedProject ? (
        <section className="border-border overflow-hidden rounded-2xl border bg-white">
          <div className="border-border flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold">{selectedProject.name}</h2>
              <p className="text-muted text-sm">
                {projectTeam.data?.members.length ?? 0} assigned member
                {(projectTeam.data?.members.length ?? 0) === 1 ? '' : 's'}
              </p>
            </div>
            <Badge variant="primary">Project scoped</Badge>
          </div>

          {projectTeam.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="h-20 w-full rounded-xl" key={index} />
              ))}
            </div>
          ) : null}

          {!projectTeam.isLoading && projectTeam.data?.members.length === 0 ? (
            <EmptyState
              description="Assign contributors to this project to see their project-specific capacity and logged hours."
              icon={UsersRound}
              title="No members assigned"
            />
          ) : null}

          {projectTeam.data?.members.map((member) => (
            <div
              className="border-border grid gap-4 border-b p-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto_auto]"
              key={member.membershipId}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={member.name} src={member.avatarUrl} />
                <div className="min-w-0">
                  <p className="truncate font-extrabold">{member.name}</p>
                  <p className="text-muted truncate text-sm">
                    {member.jobTitle ?? roleLabel(member.role)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    member.assignmentType === 'project_manager'
                      ? 'primary'
                      : 'neutral'
                  }
                >
                  {member.assignmentType.replace('_', ' ')}
                </Badge>
                <Badge
                  variant={member.status === 'active' ? 'success' : 'neutral'}
                >
                  {member.status}
                </Badge>
              </div>
              <div className="text-left md:text-right">
                <p className="font-extrabold">
                  {member.projectHoursThisWeek.toFixed(2)}h
                </p>
                <p className="text-muted text-xs">
                  of {member.weeklyCapacity}h weekly capacity
                </p>
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
