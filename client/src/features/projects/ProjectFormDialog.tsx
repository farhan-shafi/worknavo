import { zodResolver } from '@hookform/resolvers/zod';
import type { Project } from '@clientflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
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
import { useAuth } from '../auth/use-auth';
import { clientQueryKeys, useClients } from '../clients/client.queries';
import { ApiError, request } from '../../lib/api-client';
import { projectApi } from './project.api';
import { projectQueryKeys } from './project.queries';
import { projectFormSchema, type ProjectFormValues } from './project.schemas';
import { dateInputValue } from './project.utils';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  defaultClientId?: string;
}

function valuesFromProject(
  project: Project | null | undefined,
  defaultClientId: string | undefined,
  defaultCurrency: ProjectFormValues['currency'],
  defaultHourlyRate: number | null | undefined,
): ProjectFormValues {
  if (!project) {
    return {
      clientId: defaultClientId ?? '',
      name: '',
      description: '',
      status: 'active',
      hourlyRate:
        defaultHourlyRate === null || defaultHourlyRate === undefined
          ? ''
          : String(defaultHourlyRate),
      currency: defaultCurrency,
      startDate: '',
      endDate: '',
      estimatedBudget: '',
      allowedCategoryIds: [],
    };
  }

  return {
    clientId: project.clientId,
    name: project.name,
    description: project.description ?? '',
    status: project.status,
    hourlyRate: String(project.hourlyRate),
    currency: project.currency,
    startDate: dateInputValue(project.startDate),
    endDate: dateInputValue(project.endDate),
    estimatedBudget:
      project.estimatedBudget === null ? '' : String(project.estimatedBudget),
    allowedCategoryIds: project.allowedCategoryIds,
  };
}

export function ProjectFormDialog({
  defaultClientId,
  onOpenChange,
  open,
  project,
}: ProjectFormDialogProps) {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const clientsQuery = useClients({ search: '', status: 'all' });
  const defaultCurrency =
    organization?.defaultCurrency ?? user?.defaultCurrency ?? ('USD' as const);
  const defaultHourlyRate =
    organization?.defaultHourlyRate ?? user?.defaultHourlyRate;
  const categoriesQuery = useQuery({
    queryKey: ['categories', organization?.id],
    queryFn: () =>
      request<{
        categories: Array<{ id: string; name: string; active: boolean }>;
      }>('/categories'),
    enabled: open,
  });
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: valuesFromProject(
      project,
      defaultClientId,
      defaultCurrency,
      defaultHourlyRate,
    ),
  });
  const saveProject = useMutation({
    mutationFn: (values: ProjectFormValues) =>
      project
        ? projectApi.update(project.id, values)
        : projectApi.create(values),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success(message ?? 'Project saved successfully.');
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        for (const [field, messages] of Object.entries(error.issues)) {
          const message = messages?.[0];
          if (message && field in form.getValues()) {
            form.setError(field as keyof ProjectFormValues, { message });
          }
        }
      }

      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to save this project.',
      );
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        valuesFromProject(
          project,
          defaultClientId,
          defaultCurrency,
          defaultHourlyRate,
        ),
      );
    }
  }, [
    defaultClientId,
    defaultCurrency,
    defaultHourlyRate,
    form,
    open,
    project,
  ]);

  const fieldError = (field: keyof ProjectFormValues) =>
    form.formState.errors[field]?.message;
  const clients = clientsQuery.data?.clients ?? [];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? 'Edit project' : 'Create a project'}
          </DialogTitle>
          <DialogDescription>
            Connect the project to a client and define its billing details.
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-6 space-y-5"
          onSubmit={form.handleSubmit((values) => saveProject.mutate(values))}
        >
          <div className="grid gap-5 sm:grid-cols-2">
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
              error={fieldError('name')}
              label="Project name"
              required
            >
              <Input
                placeholder="Website redesign"
                {...form.register('name')}
              />
            </FormControl>
            <FormControl error={fieldError('status')} label="Status" required>
              <Select {...form.register('status')}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </Select>
            </FormControl>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <FormControl
                error={fieldError('hourlyRate')}
                label="Hourly rate"
                required
              >
                <Input
                  inputMode="decimal"
                  min="0"
                  placeholder="100"
                  step="0.01"
                  type="number"
                  {...form.register('hourlyRate')}
                />
              </FormControl>
              <FormControl error={fieldError('currency')} label="Currency">
                <Select {...form.register('currency')}>
                  <option value="USD">USD</option>
                  <option value="PKR">PKR</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </Select>
              </FormControl>
            </div>
            <FormControl error={fieldError('startDate')} label="Start date">
              <Input type="date" {...form.register('startDate')} />
            </FormControl>
            <FormControl error={fieldError('endDate')} label="End date">
              <Input type="date" {...form.register('endDate')} />
            </FormControl>
          </div>

          <FormControl
            error={fieldError('estimatedBudget')}
            label="Estimated budget"
          >
            <Input
              inputMode="decimal"
              min="0"
              placeholder="Optional project budget"
              step="0.01"
              type="number"
              {...form.register('estimatedBudget')}
            />
          </FormControl>
          <FormControl error={fieldError('description')} label="Description">
            <Textarea
              placeholder="Scope, goals, deliverables, or useful context…"
              {...form.register('description')}
            />
          </FormControl>
          <div>
            <p className="text-sm font-bold">Allowed work categories</p>
            <p className="text-muted mt-1 text-xs">
              Leave all unchecked to allow the complete category library.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {categoriesQuery.data?.categories
                .filter((category) => category.active)
                .map((category) => (
                  <label
                    className="border-border flex items-center gap-3 rounded-xl border p-3 text-sm"
                    key={category.id}
                  >
                    <input
                      className="accent-primary"
                      type="checkbox"
                      value={category.id}
                      {...form.register('allowedCategoryIds')}
                    />
                    {category.name}
                  </label>
                ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={saveProject.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={saveProject.isPending || clients.length === 0}
              type="submit"
            >
              {saveProject.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {saveProject.isPending
                ? 'Saving…'
                : project
                  ? 'Save changes'
                  : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <label className="block">
      <span className="mb-2 block text-sm font-bold">
        {label}
        {required ? <span className="text-primary ml-1">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-danger mt-1.5 block text-xs font-semibold">
          {error}
        </span>
      ) : null}
    </label>
  );
}
