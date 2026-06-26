import type { Client, Project } from '@clientflow/shared';
import { BriefcaseBusiness, CalendarDays, Plus } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { ProjectActions } from './ProjectActions';
import { ProjectDeleteDialog } from './ProjectDeleteDialog';
import { ProjectFormDialog } from './ProjectFormDialog';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { useClientProjects } from './project.queries';
import { formatMoney } from './project.utils';
import { useAuth } from '../auth/use-auth';

export function ClientProjectsTab({ client }: { client: Client }) {
  const { membership, permissions } = useAuth();
  const canManage = permissions.includes('projects.manage');
  const canCreateOrDelete =
    canManage && ['owner', 'admin'].includes(membership?.role ?? '');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const projectsQuery = useClientProjects(client.id);
  const projects = projectsQuery.data?.projects ?? [];

  const openCreate = () => {
    setEditingProject(null);
    setFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  return (
    <>
      <Card className="mt-5 overflow-hidden">
        <div className="border-border flex items-start justify-between gap-4 border-b p-5 sm:items-center">
          <div>
            <h2 className="font-extrabold">Projects for {client.name}</h2>
            <p className="text-muted mt-1 text-sm">
              Rates, budgets, status, and project timelines.
            </p>
          </div>
          {canCreateOrDelete ? (
            <Button onClick={openCreate} size="sm">
              <Plus className="size-4" /> Add project
            </Button>
          ) : null}
        </div>

        {projectsQuery.isLoading ? (
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton className="h-48 rounded-2xl" key={index} />
            ))}
          </div>
        ) : projectsQuery.isError ? (
          <div className="px-6 py-12 text-center">
            <p className="font-extrabold">Projects could not be loaded.</p>
            <Button
              className="mt-4"
              onClick={() => void projectsQuery.refetch()}
              variant="secondary"
            >
              Try again
            </Button>
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            action={
              canCreateOrDelete ? (
                <Button onClick={openCreate}>
                  <Plus className="size-4" /> Create first project
                </Button>
              ) : null
            }
            description="Create a project to connect this client to rates, budgets, and upcoming work logs."
            icon={BriefcaseBusiness}
            title="No projects for this client"
          />
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {projects.map((project) => (
              <ClientProjectCard
                canDelete={canCreateOrDelete}
                canEdit={canManage}
                canSeeFinancials={permissions.includes('financials.view')}
                key={project.id}
                onDelete={() => setDeletingProject(project)}
                onEdit={() => openEdit(project)}
                project={project}
              />
            ))}
          </div>
        )}
      </Card>

      <ProjectFormDialog
        defaultClientId={client.id}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingProject(null);
        }}
        open={formOpen}
        project={editingProject}
      />
      <ProjectDeleteDialog
        onOpenChange={(open) => {
          if (!open) setDeletingProject(null);
        }}
        open={Boolean(deletingProject)}
        project={deletingProject}
      />
    </>
  );
}

function ClientProjectCard({
  canDelete,
  canEdit,
  canSeeFinancials,
  onDelete,
  onEdit,
  project,
}: {
  canDelete: boolean;
  canEdit: boolean;
  canSeeFinancials: boolean;
  onDelete: () => void;
  onEdit: () => void;
  project: Project;
}) {
  return (
    <div className="border-border rounded-2xl border p-5">
      <div className="flex items-start gap-3">
        <span className="bg-primary-soft/40 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <BriefcaseBusiness className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{project.name}</p>
          <p className="text-muted mt-1 line-clamp-2 text-sm">
            {project.description || 'No description'}
          </p>
        </div>
        {canEdit ? (
          <ProjectActions
            canDelete={canDelete}
            onDelete={onDelete}
            onEdit={onEdit}
            project={project}
          />
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <ProjectStatusBadge status={project.status} />
        {canSeeFinancials ? (
          <Badge variant="neutral">
            {formatMoney(project.hourlyRate, project.currency)} / hour
          </Badge>
        ) : null}
        {canSeeFinancials && project.estimatedBudget !== null ? (
          <Badge variant="neutral">
            {formatMoney(project.estimatedBudget, project.currency)} budget
          </Badge>
        ) : null}
      </div>

      <p className="text-muted border-border mt-5 flex items-center gap-2 border-t pt-4 text-xs">
        <CalendarDays className="size-4" />
        {project.startDate
          ? `Starts ${new Date(project.startDate).toLocaleDateString()}`
          : 'No start date set'}
        {project.endDate
          ? ` · Ends ${new Date(project.endDate).toLocaleDateString()}`
          : ''}
      </p>
    </div>
  );
}
