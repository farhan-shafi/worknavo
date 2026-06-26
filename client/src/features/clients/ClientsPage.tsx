import type { Client, ClientStatus } from '@clientflow/shared';
import { format } from 'date-fns';
import {
  Building2,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useDeferredValue, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import {
  DataTable,
  type DataTableColumn,
} from '../../components/shared/DataTable';
import { ErrorState } from '../../components/shared/ErrorState';
import { PageHeader } from '../../components/shared/PageHeader';
import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { ClientDeleteDialog } from './ClientDeleteDialog';
import { ClientFormDialog } from './ClientFormDialog';
import { ClientStatusBadge } from './ClientStatusBadge';
import { useClients } from './client.queries';
import { useAuth } from '../auth/use-auth';

export function ClientsPage() {
  const { permissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<ClientStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const createRequested = searchParams.get('new') === '1';
  const clientsQuery = useClients({
    search: deferredSearch,
    status,
  });

  useEffect(() => {
    if (createRequested) {
      setEditingClient(null);
      setFormOpen(true);
    }
  }, [createRequested]);

  const closeForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingClient(null);
      if (searchParams.has('new')) {
        const next = new URLSearchParams(searchParams);
        next.delete('new');
        setSearchParams(next, { replace: true });
      }
    }
  };

  const openCreate = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const columns: Array<DataTableColumn<Client>> = [
    {
      key: 'client',
      header: 'Client',
      render: (client) => (
        <div className="flex items-center gap-3">
          <Avatar name={client.name} size="sm" />
          <div className="min-w-0">
            <Link
              className="hover:text-primary block truncate font-extrabold transition"
              to={`/app/clients/${client.id}`}
            >
              {client.name}
            </Link>
            <p className="text-muted mt-0.5 truncate text-xs">
              {client.companyName || 'Independent client'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (client) => (
        <a
          className="text-muted hover:text-primary transition"
          href={`mailto:${client.email}`}
        >
          {client.email}
        </a>
      ),
    },
    {
      key: 'projects',
      header: 'Projects',
      className: 'text-center',
      render: (client) => (
        <span className="font-bold">{client.activeProjects}</span>
      ),
    },
    {
      key: 'unpaid',
      header: 'Unpaid',
      render: (client) => (
        <span className="font-bold">${client.unpaidAmount.toFixed(2)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (client) => <ClientStatusBadge status={client.status} />,
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (client) => (
        <span className="text-muted text-xs">
          {format(new Date(client.updatedAt), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-14 text-right',
      render: (client) => (
        <ClientActions
          canManage={permissions.includes('clients.manage')}
          client={client}
          onDelete={() => setDeletingClient(client)}
          onEdit={() => openEdit(client)}
          onView={() => navigate(`/app/clients/${client.id}`)}
        />
      ),
    },
  ];

  const hasFilters = Boolean(deferredSearch) || status !== 'all';
  const clients = clientsQuery.data?.clients ?? [];
  const counts = clientsQuery.data?.counts ?? {
    all: 0,
    active: 0,
    inactive: 0,
    archived: 0,
  };

  return (
    <div>
      <PageHeader
        actions={
          permissions.includes('clients.manage') ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Add client
            </Button>
          ) : null
        }
        description="Manage client contacts, status, notes, and the work connected to each relationship."
        eyebrow="Clients"
        title="Your client workspace"
      />

      <div className="mt-7 grid gap-3 sm:grid-cols-4">
        {(
          [
            ['all', 'All clients'],
            ['active', 'Active'],
            ['inactive', 'Inactive'],
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
        <div className="border-border flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
            <Input
              aria-label="Search clients"
              className="pl-10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, company, or email…"
              value={search}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              aria-label="Filter clients by status"
              onChange={(event) =>
                setStatus(event.target.value as ClientStatus | 'all')
              }
              value={status}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
        </div>

        {clientsQuery.isLoading ? (
          <ClientListSkeleton />
        ) : clientsQuery.isError ? (
          <ErrorState
            description="Client records are temporarily unavailable. Confirm the API and database are connected, then retry."
            onRetry={() => void clientsQuery.refetch()}
            title="Clients could not be loaded"
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                emptyAction={
                  !hasFilters ? (
                    <Button onClick={openCreate}>
                      <Plus className="size-4" /> Add your first client
                    </Button>
                  ) : undefined
                }
                emptyDescription={
                  hasFilters
                    ? 'Try changing the search term or status filter.'
                    : 'Add your first client to start tracking projects, reports, and invoices.'
                }
                emptyIcon={UsersRound}
                emptyTitle={
                  hasFilters
                    ? 'No clients match these filters'
                    : 'No clients yet'
                }
                getRowKey={(client) => client.id}
                rows={clients}
              />
            </div>
            <div className="divide-border divide-y md:hidden">
              {clients.length > 0 ? (
                clients.map((client) => (
                  <ClientMobileCard
                    canManage={permissions.includes('clients.manage')}
                    client={client}
                    key={client.id}
                    onDelete={() => setDeletingClient(client)}
                    onEdit={() => openEdit(client)}
                    onView={() => navigate(`/app/clients/${client.id}`)}
                  />
                ))
              ) : (
                <div className="px-5 py-14 text-center">
                  <span className="bg-surface-strong text-primary mx-auto grid size-12 place-items-center rounded-2xl">
                    <UsersRound className="size-5" />
                  </span>
                  <p className="mt-4 font-extrabold">
                    {hasFilters
                      ? 'No clients match these filters'
                      : 'No clients yet'}
                  </p>
                  <p className="text-muted mx-auto mt-2 max-w-sm text-sm leading-6">
                    {hasFilters
                      ? 'Try changing the search term or status filter.'
                      : 'Add your first client to start tracking projects, reports, and invoices.'}
                  </p>
                  {!hasFilters ? (
                    <Button className="mt-5" onClick={openCreate}>
                      <Plus className="size-4" /> Add your first client
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <ClientFormDialog
        client={editingClient}
        onOpenChange={closeForm}
        open={formOpen}
      />
      <ClientDeleteDialog
        client={deletingClient}
        onOpenChange={(open) => {
          if (!open) setDeletingClient(null);
        }}
        open={Boolean(deletingClient)}
      />
    </div>
  );
}

function ClientActions({
  canManage,
  client,
  onDelete,
  onEdit,
  onView,
}: {
  canManage: boolean;
  client: Client;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Actions for ${client.name}`}
          size="icon"
          variant="ghost"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onView}>
          <UserRound className="size-4" /> View profile
        </DropdownMenuItem>
        {canManage ? (
          <>
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="size-4" /> Edit client
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-danger data-[highlighted]:bg-danger/5"
              onSelect={onDelete}
            >
              <Trash2 className="size-4" /> Delete client
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClientMobileCard({
  canManage,
  client,
  onDelete,
  onEdit,
  onView,
}: {
  canManage: boolean;
  client: Client;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
}) {
  return (
    <div className="p-5">
      <div className="flex items-start gap-3">
        <Avatar name={client.name} />
        <div className="min-w-0 flex-1">
          <Link
            className="hover:text-primary font-extrabold transition"
            to={`/app/clients/${client.id}`}
          >
            {client.name}
          </Link>
          <p className="text-muted mt-0.5 text-sm">
            {client.companyName || 'Independent client'}
          </p>
        </div>
        <ClientActions
          canManage={canManage}
          client={client}
          onDelete={onDelete}
          onEdit={onEdit}
          onView={onView}
        />
      </div>
      <div className="text-muted mt-4 grid gap-2 text-sm">
        <a
          className="hover:text-primary flex items-center gap-2 transition"
          href={`mailto:${client.email}`}
        >
          <Mail className="size-4" /> {client.email}
        </a>
        {client.companyName ? (
          <p className="flex items-center gap-2">
            <Building2 className="size-4" /> {client.companyName}
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <ClientStatusBadge status={client.status} />
        <Badge variant="neutral">{client.activeProjects} active projects</Badge>
      </div>
    </div>
  );
}

function ClientListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          className="border-border flex items-center gap-4 border-b px-5 py-4 last:border-b-0"
          key={index}
        >
          <Skeleton className="size-9 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
          <Skeleton className="hidden h-4 w-40 sm:block" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
