import { zodResolver } from '@hookform/resolvers/zod';
import type { Invoice } from '@clientflow/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
import { useAuth } from '../auth/use-auth';
import { clientQueryKeys, useClients } from '../clients/client.queries';
import { expenseQueryKeys } from '../expenses/expense.queries';
import { workLogQueryKeys } from '../work-logs/work-log.queries';
import { invoiceApi } from './invoice.api';
import { invoiceQueryKeys } from './invoice.queries';
import { invoiceFormSchema, type InvoiceFormValues } from './invoice.schemas';
import { dateInputValue } from './invoice.utils';

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  defaultClientId?: string;
}

function blankInvoiceItem() {
  return {
    description: '',
    quantity: '1',
    rate: '',
  };
}

function valuesFromInvoice(
  invoice: Invoice | null | undefined,
  defaultClientId: string | undefined,
  defaultCurrency: InvoiceFormValues['currency'],
): InvoiceFormValues {
  if (!invoice) {
    const issueDate = format(new Date(), 'yyyy-MM-dd');
    return {
      clientId: defaultClientId ?? '',
      issueDate,
      dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      currency: defaultCurrency,
      items: [blankInvoiceItem()],
      discount: '',
      taxRate: '',
      notes: '',
      status: 'draft',
    };
  }

  return {
    clientId: invoice.clientId,
    issueDate: dateInputValue(invoice.issueDate),
    dueDate: dateInputValue(invoice.dueDate),
    currency: invoice.currency,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      rate: String(item.rate),
      ...(item.workLogId ? { workLogId: item.workLogId } : {}),
      ...(item.expenseId ? { expenseId: item.expenseId } : {}),
    })),
    discount: invoice.discount ? String(invoice.discount) : '',
    taxRate: invoice.taxRate ? String(invoice.taxRate) : '',
    notes: invoice.notes ?? '',
    status: invoice.status,
  };
}

export function InvoiceFormDialog({
  defaultClientId,
  invoice,
  onOpenChange,
  open,
}: InvoiceFormDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clientsQuery = useClients({ search: '', status: 'all' });
  const defaultCurrency = user?.defaultCurrency ?? ('USD' as const);
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: valuesFromInvoice(invoice, defaultClientId, defaultCurrency),
  });
  const items = useFieldArray({
    control: form.control,
    name: 'items',
  });
  const saveInvoice = useMutation({
    mutationFn: (values: InvoiceFormValues) =>
      invoice
        ? invoiceApi.update(invoice.id, values)
        : invoiceApi.create(values),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: workLogQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: expenseQueryKeys.all });
      toast.success(message ?? 'Invoice saved successfully.');
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        for (const [field, messages] of Object.entries(error.issues)) {
          const message = messages?.[0];
          if (message && field in form.getValues()) {
            form.setError(field as keyof InvoiceFormValues, { message });
          }
        }
      }

      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to save this invoice.',
      );
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        valuesFromInvoice(
          invoice,
          defaultClientId ?? clientsQuery.data?.clients[0]?.id,
          defaultCurrency,
        ),
      );
    }
  }, [
    clientsQuery.data?.clients,
    defaultClientId,
    defaultCurrency,
    form,
    invoice,
    open,
  ]);

  const clients = clientsQuery.data?.clients ?? [];
  const fieldError = (field: keyof InvoiceFormValues) =>
    form.formState.errors[field]?.message;
  const watchedItems = form.watch('items');
  const subtotal = watchedItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    return sum + quantity * rate;
  }, 0);
  const discount = Number(form.watch('discount')) || 0;
  const taxRate = Number(form.watch('taxRate')) || 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice ? 'Edit invoice' : 'Create invoice'}
          </DialogTitle>
          <DialogDescription>
            Build a manual invoice with line items, tax, discount, and a clear
            payment status.
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-6 space-y-5"
          onSubmit={form.handleSubmit((values) => saveInvoice.mutate(values))}
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FormControl error={fieldError('clientId')} label="Client" required>
              <Select {...form.register('clientId')}>
                <option value="">Select a client</option>
                {clients.map((client) => (
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
                <option value="cancelled">Cancelled</option>
              </Select>
            </FormControl>
            <FormControl
              error={fieldError('currency')}
              label="Currency"
              required
            >
              <Select {...form.register('currency')}>
                <option value="USD">USD</option>
                <option value="PKR">PKR</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </Select>
            </FormControl>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-extrabold">Invoice items</h3>
              <Button
                onClick={() => items.append(blankInvoiceItem())}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Plus className="size-4" /> Add item
              </Button>
            </div>

            <div className="space-y-3">
              {items.fields.map((field, index) => (
                <div
                  className="grid gap-3 rounded-2xl border p-4 lg:grid-cols-[minmax(0,1.7fr)_140px_160px_56px]"
                  key={field.id}
                >
                  <FormControl
                    error={
                      form.formState.errors.items?.[index]?.description?.message
                    }
                    label={`Item ${index + 1}`}
                    required
                  >
                    <Input
                      placeholder="Design sprint planning"
                      {...form.register(`items.${index}.description`)}
                    />
                  </FormControl>
                  <FormControl
                    error={
                      form.formState.errors.items?.[index]?.quantity?.message
                    }
                    label="Hours"
                    required
                  >
                    <Input
                      inputMode="decimal"
                      step="0.01"
                      type="number"
                      {...form.register(`items.${index}.quantity`)}
                    />
                  </FormControl>
                  <FormControl
                    error={form.formState.errors.items?.[index]?.rate?.message}
                    label="Rate"
                    required
                  >
                    <Input
                      inputMode="decimal"
                      step="0.01"
                      type="number"
                      {...form.register(`items.${index}.rate`)}
                    />
                  </FormControl>
                  <div className="flex items-end">
                    <Button
                      disabled={items.fields.length === 1}
                      onClick={() => items.remove(index)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <input
                    type="hidden"
                    {...form.register(`items.${index}.workLogId`)}
                  />
                  <input
                    type="hidden"
                    {...form.register(`items.${index}.expenseId`)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <FormControl error={fieldError('notes')} label="Notes">
              <Textarea
                placeholder="Payment terms, thank-you note, or helpful delivery context."
                {...form.register('notes')}
              />
            </FormControl>

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
              disabled={saveInvoice.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={saveInvoice.isPending || clients.length === 0}
              type="submit"
            >
              {saveInvoice.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {saveInvoice.isPending
                ? 'Saving…'
                : invoice
                  ? 'Save changes'
                  : 'Create invoice'}
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
