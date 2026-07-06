import type { Client, Invoice } from '@clientflow/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { ApiError } from '../../lib/api-client';
import { clientQueryKeys } from '../clients/client.queries';
import { expenseQueryKeys } from '../expenses/expense.queries';
import { workLogQueryKeys } from '../work-logs/work-log.queries';
import { InvoiceCard } from './InvoiceCard';
import { invoiceApi } from './invoice.api';
import { InvoiceDeleteDialog } from './InvoiceDeleteDialog';
import { InvoiceFormDialog } from './InvoiceFormDialog';
import { GenerateInvoiceDialog } from './GenerateInvoiceDialog';
import { invoiceQueryKeys, useInvoices } from './invoice.queries';

export function ClientInvoicesTab({ client }: { client: Client }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const invoicesQuery = useInvoices({
    search: '',
    status: 'all',
    clientId: client.id,
    startDate: '',
    endDate: '',
  });
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
  const invoices = invoicesQuery.data?.invoices ?? [];

  return (
    <>
      <Card className="mt-5 overflow-hidden">
        <div className="border-border flex items-start justify-between gap-4 border-b p-5 sm:items-center">
          <div>
            <h2 className="font-extrabold">Invoices for {client.name}</h2>
            <p className="text-muted mt-1 text-sm">
              Manual invoices, generated billing, and payment status for this
              client.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setGenerateOpen(true)}
              size="sm"
              variant="secondary"
            >
              <ReceiptText className="size-4" /> Generate
            </Button>
            <Button onClick={() => setFormOpen(true)} size="sm">
              <Plus className="size-4" /> Add invoice
            </Button>
          </div>
        </div>

        {invoicesQuery.isLoading ? (
          <div className="grid gap-4 p-5">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton className="h-80 rounded-2xl" key={index} />
            ))}
          </div>
        ) : invoicesQuery.isError ? (
          <div className="px-6 py-12 text-center">
            <p className="font-extrabold">Invoices could not be loaded.</p>
            <Button
              className="mt-4"
              onClick={() => void invoicesQuery.refetch()}
              variant="secondary"
            >
              Try again
            </Button>
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            action={
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
            }
            description="Turn this client's billable work into invoices or create a custom billing record."
            icon={ReceiptText}
            title="No invoices for this client"
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
        defaultClientId={client.id}
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
        defaultClientId={client.id}
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
    </>
  );
}
