import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { FileText, LoaderCircle } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { ApiError } from '../../lib/api-client';
import { clientQueryKeys, useClients } from '../clients/client.queries';
import { formatMoney } from '../projects/project.utils';
import { useWorkLogs, workLogQueryKeys } from '../work-logs/work-log.queries';
import { formatHours, formatWorkLogDate } from '../work-logs/work-log.utils';
import { invoiceApi } from './invoice.api';
import { invoiceQueryKeys } from './invoice.queries';
import {
  generateInvoiceSchema,
  type GenerateInvoiceValues,
} from './invoice.schemas';

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
}

function defaultValues(
  defaultClientId: string | undefined,
): GenerateInvoiceValues {
  return {
    clientId: defaultClientId ?? '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    workLogIds: [],
    discount: '',
    taxRate: '',
    notes: '',
    status: 'draft',
  };
}

export function GenerateInvoiceDialog({
  defaultClientId,
  onOpenChange,
  open,
}: GenerateInvoiceDialogProps) {
  const queryClient = useQueryClient();
  const clientsQuery = useClients({ search: '', status: 'all' });
  const form = useForm<GenerateInvoiceValues>({
    resolver: zodResolver(generateInvoiceSchema),
    defaultValues: defaultValues(defaultClientId),
  });
  const clientId = form.watch('clientId');
  const selectedWorkLogIds = form.watch('workLogIds');
  const workLogsQuery = useWorkLogs({
    search: '',
    billable: 'all',
    clientId,
    projectId: '',
    startDate: '',
    endDate: '',
  });
  const generateInvoice = useMutation({
    mutationFn: (values: GenerateInvoiceValues) =>
      invoiceApi.generateFromWorkLogs(values),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: workLogQueryKeys.all });
      toast.success(message ?? 'Invoice generated successfully.');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to generate this invoice.',
      );
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        defaultValues(defaultClientId ?? clientsQuery.data?.clients[0]?.id),
      );
    }
  }, [clientsQuery.data?.clients, defaultClientId, form, open]);

  useEffect(() => {
    form.setValue('workLogIds', []);
  }, [clientId, form]);

  const eligibleWorkLogs = (workLogsQuery.data?.workLogs ?? []).filter(
    (workLog) => workLog.billable && !workLog.invoiceId,
  );
  const selectedWorkLogs = eligibleWorkLogs.filter((workLog) =>
    selectedWorkLogIds.includes(workLog.id),
  );
  const subtotal = selectedWorkLogs.reduce(
    (sum, workLog) => sum + workLog.amount,
    0,
  );
  const discount = Number(form.watch('discount')) || 0;
  const taxRate = Number(form.watch('taxRate')) || 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;
  const fieldError = (field: keyof GenerateInvoiceValues) =>
    form.formState.errors[field]?.message;

  const toggleWorkLog = (workLogId: string) => {
    const currentIds = form.getValues('workLogIds');

    form.setValue(
      'workLogIds',
      currentIds.includes(workLogId)
        ? currentIds.filter((id) => id !== workLogId)
        : [...currentIds, workLogId],
      { shouldValidate: true },
    );
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate invoice from work logs</DialogTitle>
          <DialogDescription>
            Select completed billable logs that have not been invoiced yet and
            turn them into one invoice.
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-6 space-y-5"
          onSubmit={form.handleSubmit((values) =>
            generateInvoice.mutate(values),
          )}
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FormControl error={fieldError('clientId')} label="Client" required>
              <Select {...form.register('clientId')}>
                <option value="">Select a client</option>
                {clientsQuery.data?.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                    {client.companyName ? ` — ${client.companyName}` : ''}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl
              error={fieldError('issueDate')}
              label="Issue date"
              required
            >
              <Input type="date" {...form.register('issueDate')} />
            </FormControl>
            <FormControl
              error={fieldError('dueDate')}
              label="Due date"
              required
            >
              <Input type="date" {...form.register('dueDate')} />
            </FormControl>
            <FormControl error={fieldError('status')} label="Status" required>
              <Select {...form.register('status')}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </Select>
            </FormControl>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-extrabold">Eligible work logs</h3>
                <Badge variant="neutral">
                  {selectedWorkLogs.length} selected
                </Badge>
              </div>

              {fieldError('workLogIds') ? (
                <p className="text-danger text-xs">
                  {fieldError('workLogIds')}
                </p>
              ) : null}

              {!clientId ? (
                <div className="rounded-2xl border p-6">
                  <EmptyState
                    compact
                    description="Choose a client first so we can load that client’s billable uninvoiced work logs."
                    icon={FileText}
                    title="Select a client"
                  />
                </div>
              ) : workLogsQuery.isLoading ? (
                <div className="rounded-2xl border p-6 text-sm text-slate-500">
                  Loading work logs…
                </div>
              ) : eligibleWorkLogs.length === 0 ? (
                <div className="rounded-2xl border p-6">
                  <EmptyState
                    compact
                    description="No billable uninvoiced work logs were found for this client."
                    icon={FileText}
                    title="Nothing ready to invoice"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {eligibleWorkLogs.map((workLog) => (
                    <label
                      className="hover:border-primary/25 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition"
                      key={workLog.id}
                    >
                      <input
                        checked={selectedWorkLogIds.includes(workLog.id)}
                        className="mt-1"
                        onChange={() => toggleWorkLog(workLog.id)}
                        type="checkbox"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-bold">{workLog.title}</p>
                          <p className="text-sm font-extrabold">
                            {formatMoney(workLog.amount, workLog.currency)}
                          </p>
                        </div>
                        <p className="text-muted mt-1 text-sm">
                          {workLog.project.name} ·{' '}
                          {formatWorkLogDate(workLog.workDate)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="neutral">
                            {formatHours(workLog.durationHours)}
                          </Badge>
                          {workLog.category ? (
                            <Badge variant="neutral">{workLog.category}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border p-5">
              <FormControl error={fieldError('discount')} label="Discount">
                <Input
                  inputMode="decimal"
                  step="0.01"
                  type="number"
                  {...form.register('discount')}
                />
              </FormControl>
              <FormControl error={fieldError('taxRate')} label="Tax rate (%)">
                <Input
                  inputMode="decimal"
                  step="0.01"
                  type="number"
                  {...form.register('taxRate')}
                />
              </FormControl>
              <FormControl error={fieldError('notes')} label="Notes">
                <Textarea
                  placeholder="Payment terms or invoice notes."
                  {...form.register('notes')}
                />
              </FormControl>

              <div className="space-y-2 border-t pt-4 text-sm">
                <SummaryRow label="Subtotal" value={subtotal} />
                <SummaryRow label="Discount" value={discount} />
                <SummaryRow label="Tax" value={taxAmount} />
                <SummaryRow emphasize label="Total" value={total} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={generateInvoice.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={generateInvoice.isPending} type="submit">
              {generateInvoice.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {generateInvoice.isPending ? 'Generating…' : 'Generate invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({
  emphasize = false,
  label,
  value,
}: {
  emphasize?: boolean;
  label: string;
  value: number;
}) {
  return (
    <div
      className={`flex items-center justify-between ${emphasize ? 'text-base font-extrabold' : ''}`}
    >
      <span className={emphasize ? '' : 'text-muted'}>{label}</span>
      <span>{value.toFixed(2)}</span>
    </div>
  );
}

function FormControl({
  children,
  error,
  label,
  required = false,
}: {
  children: ReactNode;
  error?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold">
        {label} {required ? <span className="text-danger">*</span> : null}
      </span>
      {children}
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </label>
  );
}
