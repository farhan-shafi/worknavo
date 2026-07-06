import { zodResolver } from '@hookform/resolvers/zod';
import type { Expense } from '@clientflow/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ExternalLink,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  DataTable,
  type DataTableColumn,
} from '../../components/shared/DataTable';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { ApiError } from '../../lib/api-client';
import { useClients } from '../clients/client.queries';
import { useProjects } from '../projects/project.queries';
import { formatMoney } from '../projects/project.utils';
import { expenseApi } from './expense.api';
import { expenseQueryKeys, useExpenses } from './expense.queries';
import {
  expenseFormSchema,
  type ExpenseFilters,
  type ExpenseFormValues,
} from './expense.schemas';

function defaultExpenseValues(): ExpenseFormValues {
  return {
    clientId: '',
    projectId: '',
    description: '',
    category: '',
    expenseDate: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    currency: 'USD',
    billable: 'true',
    receiptUrl: '',
    notes: '',
  };
}

function valuesFromExpense(expense: Expense): ExpenseFormValues {
  return {
    clientId: expense.clientId,
    projectId: expense.projectId ?? '',
    description: expense.description,
    category: expense.category ?? '',
    expenseDate: expense.expenseDate.slice(0, 10),
    amount: String(expense.amount),
    currency: expense.currency,
    billable: expense.billable ? 'true' : 'false',
    receiptUrl: expense.receiptUrl ?? '',
    notes: expense.notes ?? '',
  };
}

export function ExpensesPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ExpenseFilters>({
    clientId: '',
    projectId: '',
    billable: 'all',
    invoice: 'all',
    startDate: '',
    endDate: '',
  });
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const clientsQuery = useClients({ search: '', status: 'all' });
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: defaultExpenseValues(),
  });
  const selectedClientId = form.watch('clientId');
  const projectsQuery = useProjects({
    clientId: selectedClientId,
    search: '',
    status: 'all',
  });
  const expensesQuery = useExpenses(filters);
  const expenses = expensesQuery.data?.expenses ?? [];
  const summary = expensesQuery.data?.summary ?? {
    totalAmount: 0,
    billableAmount: 0,
    uninvoicedBillableAmount: 0,
  };
  const clients = clientsQuery.data?.clients ?? [];
  const projects = useMemo(
    () => projectsQuery.data?.projects ?? [],
    [projectsQuery.data?.projects],
  );

  const saveExpense = useMutation({
    mutationFn: (values: ExpenseFormValues) =>
      editingExpense
        ? expenseApi.update(editingExpense.id, values)
        : expenseApi.create(values),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: expenseQueryKeys.all });
      toast.success(message ?? 'Expense saved successfully.');
      setEditingExpense(null);
      form.reset(defaultExpenseValues());
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        for (const [field, messages] of Object.entries(error.issues)) {
          const message = messages?.[0];
          if (message && field in form.getValues()) {
            form.setError(field as keyof ExpenseFormValues, { message });
          }
        }
      }

      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to save this expense.',
      );
    },
  });
  const deleteExpense = useMutation({
    mutationFn: expenseApi.delete,
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: expenseQueryKeys.all });
      toast.success(message);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to delete this expense.',
      );
    },
  });

  useEffect(() => {
    if (!selectedClientId) {
      form.setValue('projectId', '');
    }
  }, [form, selectedClientId]);

  const columns: Array<DataTableColumn<Expense>> = [
    {
      key: 'expense',
      header: 'Expense',
      render: (expense) => (
        <div>
          <p className="font-extrabold">{expense.description}</p>
          <p className="text-muted mt-1 text-xs">
            {new Date(expense.expenseDate).toLocaleDateString()}
            {expense.category ? ` · ${expense.category}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Client / project',
      render: (expense) => (
        <div>
          <p className="font-bold">{expense.client.name}</p>
          <p className="text-muted mt-1 text-xs">
            {expense.project?.name ?? 'No project'}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (expense) => (
        <span className="font-extrabold">
          {formatMoney(expense.amount, expense.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (expense) => (
        <div className="flex flex-wrap gap-2">
          <Badge variant={expense.billable ? 'primary' : 'neutral'}>
            {expense.billable ? 'Billable' : 'Non-billable'}
          </Badge>
          <Badge variant={expense.invoiceId ? 'success' : 'neutral'}>
            {expense.invoiceId ? 'Invoiced' : 'Uninvoiced'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'receipt',
      header: 'Receipt',
      render: (expense) =>
        expense.receiptUrl ? (
          <a
            className="text-primary inline-flex items-center gap-1 text-sm font-bold"
            href={expense.receiptUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-muted text-sm">None</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32 text-right',
      render: (expense) => (
        <div className="flex justify-end gap-1">
          <Button
            disabled={Boolean(expense.invoiceId)}
            onClick={() => {
              setEditingExpense(expense);
              form.reset(valuesFromExpense(expense));
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            className="text-danger hover:bg-danger/5"
            disabled={Boolean(expense.invoiceId) || deleteExpense.isPending}
            onClick={() => deleteExpense.mutate(expense.id)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  const fieldError = (field: keyof ExpenseFormValues) =>
    form.formState.errors[field]?.message;

  return (
    <div className="space-y-6">
      <PageHeader
        description="Track fixed costs, receipts, reimbursable expenses, and billable expenses that can be included on invoices."
        eyebrow="Financials"
        title="Expenses"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={ReceiptText}
          label="Total expenses"
          value={formatMoney(summary.totalAmount, 'USD')}
        />
        <StatCard
          icon={ReceiptText}
          label="Billable"
          value={formatMoney(summary.billableAmount, 'USD')}
        />
        <StatCard
          icon={ReceiptText}
          label="Uninvoiced billable"
          value={formatMoney(summary.uninvoicedBillableAmount, 'USD')}
        />
      </div>

      <Card className="p-5">
        <form
          className="grid gap-4 lg:grid-cols-4"
          onSubmit={form.handleSubmit((values) => saveExpense.mutate(values))}
        >
          <FormControl error={fieldError('clientId')} label="Client" required>
            <Select {...form.register('clientId')}>
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl error={fieldError('projectId')} label="Project">
            <Select {...form.register('projectId')}>
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl
            error={fieldError('description')}
            label="Description"
            required
          >
            <Input
              placeholder="Hosting, travel, stock photo..."
              {...form.register('description')}
            />
          </FormControl>
          <FormControl error={fieldError('category')} label="Category">
            <Input placeholder="Software" {...form.register('category')} />
          </FormControl>
          <FormControl
            error={fieldError('expenseDate')}
            label="Expense date"
            required
          >
            <Input type="date" {...form.register('expenseDate')} />
          </FormControl>
          <FormControl error={fieldError('amount')} label="Amount" required>
            <Input
              inputMode="decimal"
              min="0"
              step="0.01"
              type="number"
              {...form.register('amount')}
            />
          </FormControl>
          <FormControl error={fieldError('currency')} label="Currency" required>
            <Select {...form.register('currency')}>
              <option value="USD">USD</option>
              <option value="PKR">PKR</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </Select>
          </FormControl>
          <FormControl error={fieldError('billable')} label="Billing" required>
            <Select {...form.register('billable')}>
              <option value="true">Billable</option>
              <option value="false">Non-billable</option>
            </Select>
          </FormControl>
          <FormControl error={fieldError('receiptUrl')} label="Receipt URL">
            <Input
              placeholder="Cloudinary or receipt link"
              {...form.register('receiptUrl')}
            />
          </FormControl>
          <FormControl error={fieldError('notes')} label="Notes">
            <Textarea
              className="min-h-11"
              placeholder="Optional internal notes"
              {...form.register('notes')}
            />
          </FormControl>
          <div className="flex items-end gap-2 lg:col-span-2">
            <Button disabled={saveExpense.isPending} type="submit">
              {saveExpense.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : editingExpense ? (
                <Pencil className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {editingExpense ? 'Update expense' : 'Add expense'}
            </Button>
            {editingExpense ? (
              <Button
                onClick={() => {
                  setEditingExpense(null);
                  form.reset(defaultExpenseValues());
                }}
                type="button"
                variant="outline"
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-border grid gap-3 border-b p-4 md:grid-cols-3 lg:grid-cols-6">
          <Select
            aria-label="Filter by client"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                clientId: event.target.value,
                projectId: '',
              }))
            }
            value={filters.clientId}
          >
            <option value="">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter billable"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                billable: event.target.value as ExpenseFilters['billable'],
              }))
            }
            value={filters.billable}
          >
            <option value="all">All billing</option>
            <option value="billable">Billable</option>
            <option value="non-billable">Non-billable</option>
          </Select>
          <Select
            aria-label="Filter invoice status"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                invoice: event.target.value as ExpenseFilters['invoice'],
              }))
            }
            value={filters.invoice}
          >
            <option value="all">All invoice states</option>
            <option value="uninvoiced">Uninvoiced</option>
            <option value="invoiced">Invoiced</option>
          </Select>
          <Input
            aria-label="Start date"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
            type="date"
            value={filters.startDate}
          />
          <Input
            aria-label="End date"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                endDate: event.target.value,
              }))
            }
            type="date"
            value={filters.endDate}
          />
          <Button
            onClick={() =>
              setFilters({
                clientId: '',
                projectId: '',
                billable: 'all',
                invoice: 'all',
                startDate: '',
                endDate: '',
              })
            }
            type="button"
            variant="outline"
          >
            Clear
          </Button>
        </div>
        <DataTable
          columns={columns}
          emptyDescription="Add software, travel, hosting, or other fixed costs that should be tracked against client work."
          emptyIcon={ReceiptText}
          emptyTitle={
            expensesQuery.isLoading ? 'Loading expenses…' : 'No expenses yet'
          }
          getRowKey={(expense) => expense.id}
          rows={expenses}
        />
      </Card>
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
