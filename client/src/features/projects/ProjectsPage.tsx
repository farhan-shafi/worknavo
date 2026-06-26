import type { Project, ProjectStatus } from '@clientflow/shared';
import { format } from 'date-fns';
import {
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Plus,
  Search,
  UserRound,
} from 'lucide-react';
import { useDeferredValue, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  DataTable,
  type DataTableColumn,
} from '../../components/shared/DataTable';
import { ErrorState } from '../../components/shared/ErrorState';
import { PageHeader } from '../../components/shared/PageHeader';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { useClients } from '../clients/client.queries';
import { ProjectActions } from './ProjectActions';
import { ProjectDeleteDialog } from './ProjectDeleteDialog';
import { ProjectFormDialog } from './ProjectFormDialog';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { useProjects } from './project.queries';
import { formatMoney } from './project.utils';
import { useAuth } from '../auth/use-auth';

export function ProjectsPage() {
  const { membership, permissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [clientId, setClientId] = useState(searchParams.get('clientId') ?? '');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const createRequested = searchParams.get('new') === '1';
  const clientsQuery = useClients({ search: '', status: 'all' });
  const projectsQuery = useProjects({
    clientId,
    search: deferredSearch,
    status,
  });

  useEffect(() => {
    if (createRequested) {
      setEditingProject(null);
      setFormOpen(true);
    }
  }, [createRequested]);

  const closeForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingProject(null);
      if (searchParams.has('new')) {
        const next = new URLSearchParams(searchParams);
        next.delete('new');
        setSearchParams(next, { replace: true });
      }
    }
  };

  const openCreate = () => {
    setEditingProject(null);
    setFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const columns: Array<DataTableColumn<Project>> = [
    {
      key: 'project',
      header: 'Project',
      render: (project) => (
        <div>
          <p className="font-extrabold">{project.name}</p>
          <p className="text-muted mt-0.5 max-w-64 truncate text-xs">
            {project.description || 'No description'}
          </p>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (project) => (
        <Link
          className="hover:text-primary font-bold transition"
          to={`/app/clients/${project.clientId}`}
        >
          {project.client.name}
        </Link>
      ),
    },
    {
      key: 'rate',
      header: 'Hourly rate',
      render: (project) => (
        <span className="font-bold">
          {permissions.includes('financials.view')
            ? formatMoney(project.hourlyRate, project.currency)
            : 'Restricted'}
        </span>
      ),
    },
    {
      key: 'budget',
      header: 'Budget',
      render: (project) => (
        <span className="text-muted">
          {!permissions.includes('financials.view')
            ? 'Restricted'
            : project.estimatedBudget === null
              ? '—'
              : formatMoney(project.estimatedBudget, project.currency)}
        </span>
      ),
    },
    {
      key: 'dates',
      header: 'Timeline',
      render: (project) => (
        <span className="text-muted text-xs">{projectTimeline(project)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (project) => <ProjectStatusBadge status={project.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-14 text-right',
      render: (project) =>
        permissions.includes('projects.manage') ? (
          <ProjectActions
            canDelete={['owner', 'admin'].includes(membership?.role ?? '')}
            onDelete={() => setDeletingProject(project)}
            onEdit={() => openEdit(project)}
            project={project}
          />
        ) : null,
    },
  ];

  const projects = projectsQuery.data?.projects ?? [];
  const clients = clientsQuery.data?.clients ?? [];
  const counts = projectsQuery.data?.counts ?? {
    all: 0,
    active: 0,
    paused: 0,
    completed: 0,
    archived: 0,
  };
  const hasFilters =
    Boolean(deferredSearch) || status !== 'all' || Boolean(clientId);
  const hasClients = clients.length > 0;

  return (
    <div>
      <PageHeader
        actions={
          permissions.includes('projects.manage') &&
          ['owner', 'admin'].includes(membership?.role ?? '') ? (
            <Button disabled={!hasClients} onClick={openCreate}>
              <Plus className="size-4" /> Create project
            </Button>
          ) : null
        }
        description="Connect client work to rates, budgets, timelines, and a clear project status."
        eyebrow="Projects"
        title="Project operations"
      />

      {permissions.includes('clients.manage') &&
      !clientsQuery.isLoading &&
      !hasClients ? (
        <Card className="mt-7 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold">Add a client before a project</p>
              <p className="text-muted mt-1 text-sm">
                Every project must be linked to a client in your workspace.
              </p>
            </div>
            <Button asChild>
              <Link to="/app/clients?new=1">
                <UserRound className="size-4" /> Add client
              </Link>
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(
          [
            ['all', 'All projects'],
            ['active', 'Active'],
            ['paused', 'Paused'],
            ['completed', 'Completed'],
            ['archived', 'Archived'],
          ] as const
        ).map(([value, label]) => (
          <button
            className={`rounded-2xl border p-4 text-left transition ${
              status === value
                ? 'border-primary/25 bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/20 bg-white'
            }`}
            key={value}
            onClick={() => setStatus(value)}
            type="button"
          >
            <p className="text-muted text-xs font-bold">{label}</p>
            <p className="mt-2 text-2xl font-extrabold">{counts[value]}</p>
          </button>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="border-border grid gap-3 border-b p-4 sm:grid-cols-[minmax(0,1fr)_190px_170px]">
          <div className="relative">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
            <Input
              aria-label="Search projects"
              className="pl-10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search project name…"
              value={search}
            />
          </div>
          <Select
            aria-label="Filter projects by client"
            onChange={(event) => setClientId(event.target.value)}
            value={clientId}
          >
            <option value="">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter projects by status"
            onChange={(event) =>
              setStatus(event.target.value as ProjectStatus | 'all')
            }
            value={status}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </Select>
        </div>

        {projectsQuery.isLoading ? (
          <ProjectListSkeleton />
        ) : projectsQuery.isError ? (
          <ErrorState
            description="Project records are temporarily unavailable. Confirm the API and database are connected, then retry."
            onRetry={() => void projectsQuery.refetch()}
            title="Projects could not be loaded"
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <DataTable
                columns={columns}
                emptyAction={
                  !hasFilters && hasClients ? (
                    <Button onClick={openCreate}>
                      <Plus className="size-4" /> Create your first project
                    </Button>
                  ) : undefined
                }
                emptyDescription={
                  hasFilters
                    ? 'Try changing the project, client, or status filter.'
                    : 'Create a project to store its client, rate, budget, and timeline.'
                }
                emptyIcon={BriefcaseBusiness}
                emptyTitle={
                  hasFilters
                    ? 'No projects match these filters'
                    : 'No projects yet'
                }
                getRowKey={(project) => project.id}
                rows={projects}
              />
            </div>
            <div className="divide-border divide-y lg:hidden">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <ProjectMobileCard
                    canManage={permissions.includes('projects.manage')}
                    canDelete={['owner', 'admin'].includes(
                      membership?.role ?? '',
                    )}
                    canSeeFinancials={permissions.includes('financials.view')}
                    key={project.id}
                    onDelete={() => setDeletingProject(project)}
                    onEdit={() => openEdit(project)}
                    project={project}
                  />
                ))
              ) : (
                <div className="px-5 py-14 text-center">
                  <span className="bg-surface-strong text-primary mx-auto grid size-12 place-items-center rounded-2xl">
                    <BriefcaseBusiness className="size-5" />
                  </span>
                  <p className="mt-4 font-extrabold">
                    {hasFilters
                      ? 'No projects match these filters'
                      : 'No projects yet'}
                  </p>
                  <p className="text-muted mx-auto mt-2 max-w-sm text-sm leading-6">
                    {hasFilters
                      ? 'Try changing the project, client, or status filter.'
                      : 'Create a project to store its client, rate, budget, and timeline.'}
                  </p>
                  {!hasFilters && hasClients ? (
                    <Button className="mt-5" onClick={openCreate}>
                      <Plus className="size-4" /> Create your first project
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <ProjectFormDialog
        defaultClientId={clientId || undefined}
        onOpenChange={closeForm}
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
    </div>
  );
}

function ProjectMobileCard({
  canDelete,
  canManage,
  canSeeFinancials,
  onDelete,
  onEdit,
  project,
}: {
  canDelete: boolean;
  canManage: boolean;
  canSeeFinancials: boolean;
  onDelete: () => void;
  onEdit: () => void;
  project: Project;
}) {
  return (
    <div className="p-5">
      <div className="flex items-start gap-3">
        <span className="bg-primary-soft/40 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <BriefcaseBusiness className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{project.name}</p>
          <Link
            className="text-muted hover:text-primary mt-0.5 block text-sm transition"
            to={`/app/clients/${project.clientId}`}
          >
            {project.client.name}
          </Link>
        </div>
        {canManage ? (
          <ProjectActions
            canDelete={canDelete}
            onDelete={onDelete}
            onEdit={onEdit}
            project={project}
          />
        ) : null}
      </div>
      <div className="text-muted mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {canSeeFinancials ? (
          <p className="flex items-center gap-2">
            <CircleDollarSign className="size-4" />
            {formatMoney(project.hourlyRate, project.currency)} / hour
          </p>
        ) : null}
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4" />
          {projectTimeline(project)}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <ProjectStatusBadge status={project.status} />
        {canSeeFinancials && project.estimatedBudget !== null ? (
          <Badge variant="neutral">
            {formatMoney(project.estimatedBudget, project.currency)} budget
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function projectTimeline(project: Project) {
  if (!project.startDate && !project.endDate) return 'No dates set';
  if (project.startDate && project.endDate) {
    return `${format(new Date(project.startDate), 'MMM d, yyyy')} – ${format(
      new Date(project.endDate),
      'MMM d, yyyy',
    )}`;
  }
  if (project.startDate) {
    return `Starts ${format(new Date(project.startDate), 'MMM d, yyyy')}`;
  }
  return `Ends ${format(new Date(project.endDate!), 'MMM d, yyyy')}`;
}

function ProjectListSkeleton() {
  return (
    <div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          className="border-border flex items-center gap-4 border-b px-5 py-4 last:border-b-0"
          key={index}
        >
          <Skeleton className="size-9 rounded-xl" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
          <Skeleton className="hidden h-4 w-28 sm:block" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
