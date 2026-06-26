import type { Client } from '@clientflow/shared';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  FileText,
  Globe2,
  History,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  StickyNote,
  Trash2,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ChartCard } from '../../components/shared/ChartCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { ClientDeleteDialog } from './ClientDeleteDialog';
import { ClientFormDialog } from './ClientFormDialog';
import { ClientStatusBadge } from './ClientStatusBadge';
import { useClientOverview } from './client.queries';
import { ClientInvoicesTab } from '../invoices/ClientInvoicesTab';
import { ClientProjectsTab } from '../projects/ClientProjectsTab';
import { ClientReportsTab } from '../reports/ClientReportsTab';
import { ClientWorkLogsTab } from '../work-logs/ClientWorkLogsTab';

type ClientTab =
  | 'overview'
  | 'projects'
  | 'work-logs'
  | 'reports'
  | 'invoices'
  | 'notes';

const tabs: Array<{
  value: ClientTab;
  label: string;
  live: boolean;
}> = [
  { value: 'overview', label: 'Overview', live: true },
  { value: 'projects', label: 'Projects', live: true },
  { value: 'work-logs', label: 'Work logs', live: true },
  { value: 'reports', label: 'Reports', live: true },
  { value: 'invoices', label: 'Invoices', live: true },
  { value: 'notes', label: 'Notes', live: true },
];

export function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ClientTab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const clientQuery = useClientOverview(clientId);

  if (clientQuery.isLoading) {
    return <ClientDetailSkeleton />;
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <Card>
        <EmptyState
          action={
            <Button asChild variant="secondary">
              <Link to="/app/clients">
                <ArrowLeft className="size-4" /> Back to clients
              </Link>
            </Button>
          }
          description="The client may have been deleted or does not belong to this workspace."
          icon={UserRound}
          title="Client not found"
        />
      </Card>
    );
  }

  const { client, metrics } = clientQuery.data;

  const selectTab = (nextTab: (typeof tabs)[number]) => {
    if (!nextTab.live) {
      toast.info(`${nextTab.label} will connect in a later phase.`);
      return;
    }

    setTab(nextTab.value);
  };

  return (
    <div>
      <Link
        className="text-muted hover:text-foreground mb-5 inline-flex items-center gap-2 text-sm font-bold transition"
        to="/app/clients"
      >
        <ArrowLeft className="size-4" /> Back to clients
      </Link>

      <PageHeader
        actions={
          <>
            <Button onClick={() => setEditOpen(true)} variant="secondary">
              <Pencil className="size-4" /> Edit
            </Button>
            <Button onClick={() => setDeleteOpen(true)} variant="outline">
              <Trash2 className="text-danger size-4" /> Delete
            </Button>
          </>
        }
        description={
          client.companyName
            ? `${client.companyName} · ${client.email}`
            : client.email
        }
        eyebrow="Client profile"
        title={client.name}
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <ClientStatusBadge status={client.status} />
        <Badge variant="neutral">
          Added {new Date(client.createdAt).toLocaleDateString()}
        </Badge>
      </div>

      <div className="border-border mt-7 flex gap-1 overflow-x-auto border-b">
        {tabs.map((item) => (
          <button
            className={`relative px-4 py-3 text-sm font-bold whitespace-nowrap transition ${
              tab === item.value
                ? 'text-primary'
                : 'text-muted hover:text-foreground'
            }`}
            key={item.value}
            onClick={() => selectTab(item)}
            type="button"
          >
            {item.label}
            {!item.live ? (
              <span className="bg-surface-strong ml-2 rounded px-1.5 py-0.5 text-[8px] font-extrabold tracking-wide uppercase">
                Soon
              </span>
            ) : null}
            {tab === item.value ? (
              <span className="bg-primary absolute inset-x-3 bottom-0 h-0.5 rounded-full" />
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'projects' ? (
        <ClientProjectsTab client={client} />
      ) : tab === 'invoices' ? (
        <ClientInvoicesTab client={client} />
      ) : tab === 'reports' ? (
        <ClientReportsTab client={client} />
      ) : tab === 'work-logs' ? (
        <ClientWorkLogsTab client={client} />
      ) : tab === 'notes' ? (
        <Card className="mt-5 p-6">
          <h2 className="flex items-center gap-2 font-extrabold">
            <StickyNote className="text-primary size-5" /> Internal notes
          </h2>
          {client.notes ? (
            <p className="text-muted mt-4 leading-7 whitespace-pre-wrap">
              {client.notes}
            </p>
          ) : (
            <EmptyState
              action={
                <Button onClick={() => setEditOpen(true)} variant="secondary">
                  <Plus className="size-4" /> Add notes
                </Button>
              }
              compact
              description="Add useful relationship context, preferences, or communication notes."
              icon={StickyNote}
              title="No notes yet"
            />
          )}
        </Card>
      ) : (
        <ClientOverview client={client} metrics={metrics} />
      )}

      <ClientFormDialog
        client={client}
        onOpenChange={setEditOpen}
        open={editOpen}
      />
      <ClientDeleteDialog
        client={client}
        onDeleted={() => navigate('/app/clients', { replace: true })}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
      />
    </div>
  );
}

function ClientOverview({
  client,
  metrics,
}: {
  client: Client;
  metrics: {
    totalBilled: number;
    totalPaid: number;
    openInvoices: number;
    activeProjects: number;
    totalHours: number;
  };
}) {
  return (
    <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label="Total billed"
          value={`$${metrics.totalBilled.toFixed(2)}`}
        />
        <StatCard
          icon={ReceiptText}
          label="Total paid"
          value={`$${metrics.totalPaid.toFixed(2)}`}
        />
        <StatCard
          icon={FileText}
          label="Open invoices"
          value={String(metrics.openInvoices)}
        />
        <StatCard
          icon={BriefcaseBusiness}
          label="Active projects"
          value={String(metrics.activeProjects)}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={client.name} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold">{client.name}</h2>
              <p className="text-muted truncate text-sm">
                {client.companyName || 'Independent client'}
              </p>
            </div>
          </div>

          <div className="border-border mt-6 space-y-4 border-t pt-6">
            <ContactRow icon={Mail}>
              <a className="hover:text-primary" href={`mailto:${client.email}`}>
                {client.email}
              </a>
            </ContactRow>
            {client.phone ? (
              <ContactRow icon={Phone}>
                <a className="hover:text-primary" href={`tel:${client.phone}`}>
                  {client.phone}
                </a>
              </ContactRow>
            ) : null}
            {client.website ? (
              <ContactRow icon={Globe2}>
                <a
                  className="hover:text-primary break-all"
                  href={websiteHref(client.website)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {client.website}
                </a>
              </ContactRow>
            ) : null}
            {client.address ? (
              <ContactRow icon={MapPin}>{client.address}</ContactRow>
            ) : null}
            {client.companyName ? (
              <ContactRow icon={Building2}>{client.companyName}</ContactRow>
            ) : null}
          </div>
        </Card>

        <ChartCard
          action={<Badge variant="neutral">{metrics.totalHours} hours</Badge>}
          description="Projects, logs, reports, and invoices will appear here as they are created."
          title="Recent client activity"
        >
          <EmptyState
            compact
            description="This profile is ready. The next activity will be creating the client’s first project."
            icon={History}
            title="No activity yet"
          />
        </ChartCard>
      </div>
    </>
  );
}

function ContactRow({
  children,
  icon: Icon,
}: {
  children: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div className="text-muted flex items-start gap-3 text-sm">
      <Icon className="text-primary mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 leading-5">{children}</div>
    </div>
  );
}

function websiteHref(website: string) {
  return website.startsWith('http://') || website.startsWith('https://')
    ? website
    : `https://${website}`;
}

function ClientDetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-6 h-10 w-72" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card className="p-5" key={index}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-7 h-8 w-20" />
          </Card>
        ))}
      </div>
    </div>
  );
}
