import type { Invoice, InvoiceStatus } from '@clientflow/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CircleDollarSign,
  Clock3,
  FileText,
  Plus,
  ReceiptText,
  Search,
} from 'lucide-react';
import { useDeferredValue, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { ApiError } from '../../lib/api-client';
import { clientQueryKeys, useClients } from '../clients/client.queries';
import { expenseQueryKeys } from '../expenses/expense.queries';
import { workLogQueryKeys } from '../work-logs/work-log.queries';
import { InvoiceCard } from './InvoiceCard';
import { invoiceApi } from './invoice.api';
import { InvoiceDeleteDialog } from './InvoiceDeleteDialog';
import { InvoiceFormDialog } from './InvoiceFormDialog';
import { GenerateInvoiceDialog } from './GenerateInvoiceDialog';
import { invoiceQueryKeys, useInvoices } from './invoice.queries';
import { type InvoiceFilters } from './invoice.schemas';

export function InvoicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all');
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const filters: InvoiceFilters = {
    search: deferredSearch,
    status,
    clientId,
    startDate,
    endDate,
  };
  const clientsQuery = useClients({ search: '', status: 'all' });
  const invoicesQuery = useInvoices(filters);
  const markPaid = useMutation({
    mutationFn: (invoiceId: string) => invoiceApi.markPaid(invoiceId),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: workLogQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: expenseQueryKeys.all });
      toast.success(message ?? 'Invoice marked as paid.');
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to mark this invoice as paid.',
      );
    },
  });

  useEffect(() => {
    if (!clientId) {
      return;
    }

    if (!clientsQuery.data?.clients.some((client) => client.id === clientId)) {
      setClientId('');
    }
  }, [clientId, clientsQuery.data?.clients]);

  const invoices = invoicesQuery.data?.invoices ?? [];
  const counts = invoicesQuery.data?.counts ?? {
    all: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
  };
  const summary = invoicesQuery.data?.summary ?? {
    totalBilled: 0,
    totalPaid: 0,
    outstandingAmount: 0,
  };
  const hasClients = (clientsQuery.data?.clients.length ?? 0) > 0;
  const hasFilters =
    Boolean(deferredSearch) ||
    status !== 'all' ||
    Boolean(clientId) ||
    Boolean(startDate) ||
    Boolean(endDate);

  return (
    <div>
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!hasClients}
              onClick={() => setGenerateOpen(true)}
              variant="secondary"
            >
              <ReceiptText className="size-4" /> Generate from logs
            </Button>
            <Button disabled={!hasClients} onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Create invoice
            </Button>
          </div>
        }
        description="Create manual invoices or turn approved billable work into ready-to-send billing records."
        eyebrow="Invoices"
        title="Billing operations"
      />

      {!clientsQuery.isLoading && !hasClients ? (
        <Card className="mt-7 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold">Add a client before invoicing</p>
              <p className="text-muted mt-1 text-sm">
                Invoices belong to clients, so the billing module starts once a
                client exists.
              </p>
            </div>
            <Button asChild>
              <Link to="/app/clients?new=1">
                <FileText className="size-4" /> Add client
              </Link>
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label="Total billed"
          value={summary.totalBilled.toFixed(2)}
        />
        <StatCard
          icon={ReceiptText}
          label="Collected"
          value={summary.totalPaid.toFixed(2)}
        />
        <StatCard
          icon={Clock3}
          label="Outstanding"
          value={summary.outstandingAmount.toFixed(2)}
        />
        <StatCard icon={FileText} label="Invoices" value={String(counts.all)} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {(
          [
            ['all', 'All'],
            ['draft', 'Draft'],
            ['sent', 'Sent'],
            ['paid', 'Paid'],
            ['overdue', 'Overdue'],
            ['cancelled', 'Cancelled'],
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
        <div className="border-border grid gap-3 border-b p-4 lg:grid-cols-[minmax(0,1fr)_180px_170px_170px_170px]">
          <div className="relative">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
            <Input
              aria-label="Search invoices"
              className="pl-10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice number or notes"
              value={search}
            />
          </div>
          <Select
            onChange={(event) => setClientId(event.target.value)}
            value={clientId}
          >
            <option value="">All clients</option>
            {clientsQuery.data?.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
          <Select
            onChange={(event) =>
              setStatus(event.target.value as InvoiceStatus | 'all')
            }
            value={status}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Input
            onChange={(event) => setStartDate(event.target.value)}
            type="date"
            value={startDate}
          />
          <Input
            onChange={(event) => setEndDate(event.target.value)}
            type="date"
            value={endDate}
          />
        </div>

        {invoicesQuery.isLoading ? (
          <div className="grid gap-4 p-5">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton className="h-80 rounded-2xl" key={index} />
            ))}
          </div>
        ) : invoicesQuery.isError ? (
          <ErrorState
            description="Invoice records are temporarily unavailable. Confirm the API and database are connected, then retry."
            onRetry={() => void invoicesQuery.refetch()}
            title="Invoices could not be loaded"
          />
        ) : invoices.length === 0 ? (
          <EmptyState
            action={
              hasClients ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    onClick={() => setGenerateOpen(true)}
                    variant="secondary"
                  >
                    <ReceiptText className="size-4" /> Generate invoice
                  </Button>
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus className="size-4" /> Create manual invoice
                  </Button>
                </div>
              ) : undefined
            }
            description={
              hasFilters
                ? 'No invoices match these filters yet.'
                : 'Create your first invoice from work logs or add a manual billing record.'
            }
            icon={ReceiptText}
            title={hasFilters ? 'No matching invoices' : 'No invoices yet'}
          />
        ) : (
          <div className="space-y-4 p-5">
            {invoices.map((invoice) => (
              <InvoiceCard
                invoice={invoice}
                key={invoice.id}
                onDelete={() => setDeletingInvoice(invoice)}
                onEdit={() => {
                  setEditingInvoice(invoice);
                  setFormOpen(true);
                }}
                onMarkPaid={() => markPaid.mutate(invoice.id)}
              />
            ))}
          </div>
        )}
      </Card>

      <InvoiceFormDialog
        defaultClientId={clientId || undefined}
        invoice={editingInvoice}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingInvoice(null);
          }
        }}
        open={formOpen}
      />
      <GenerateInvoiceDialog
        defaultClientId={clientId || undefined}
        onOpenChange={setGenerateOpen}
        open={generateOpen}
      />
      <InvoiceDeleteDialog
        invoice={deletingInvoice}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingInvoice(null);
          }
        }}
        open={Boolean(deletingInvoice)}
      />
    </div>
  );
}
