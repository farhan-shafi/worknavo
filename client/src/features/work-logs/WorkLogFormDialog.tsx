import { zodResolver } from '@hookform/resolvers/zod';
import type { WorkLog } from '@clientflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, type ReactNode } from 'react';
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
import { ApiError, request } from '../../lib/api-client';
import { clientQueryKeys, useClients } from '../clients/client.queries';
import { useProjects } from '../projects/project.queries';
import { workLogApi } from './work-log.api';
import { workLogQueryKeys } from './work-log.queries';
import { workLogFormSchema, type WorkLogFormValues } from './work-log.schemas';
import { dateInputValue } from './work-log.utils';

interface WorkLogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workLog?: WorkLog | null;
  defaultClientId?: string;
  defaultProjectId?: string;
}

function valuesFromWorkLog(
  workLog: WorkLog | null | undefined,
  defaultClientId: string | undefined,
  defaultProjectId: string | undefined,
): WorkLogFormValues {
  if (!workLog) {
    return {
      clientId: defaultClientId ?? '',
      projectId: defaultProjectId ?? '',
      title: '',
      description: '',
      categoryId: '',
      tags: '',
      workDate: format(new Date(), 'yyyy-MM-dd'),
      durationHours: '',
      billable: 'true',
    };
  }

  return {
    clientId: workLog.clientId,
    projectId: workLog.projectId,
    title: workLog.title,
    description: workLog.description ?? '',
    categoryId: workLog.categoryId ?? '',
    tags: workLog.tags.join(', '),
    workDate: dateInputValue(workLog.workDate),
    durationHours: String(workLog.durationHours),
    billable: workLog.billable ? 'true' : 'false',
  };
}

export function WorkLogFormDialog({
  defaultClientId,
  defaultProjectId,
  onOpenChange,
  open,
  workLog,
}: WorkLogFormDialogProps) {
  const queryClient = useQueryClient();
  const clientsQuery = useClients({ search: '', status: 'all' });
  const form = useForm<WorkLogFormValues>({
    resolver: zodResolver(workLogFormSchema),
    defaultValues: valuesFromWorkLog(
      workLog,
      defaultClientId,
      defaultProjectId,
    ),
  });
  const selectedClientId = form.watch('clientId');
  const selectedProjectId = form.watch('projectId');
  const projectsQuery = useProjects({
    clientId: selectedClientId,
    search: '',
    status: 'all',
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'project', selectedProjectId],
    queryFn: () =>
      request<{
        categories: Array<{
          id: string;
          name: string;
          defaultBillable: boolean;
          active: boolean;
        }>;
      }>(`/categories?projectId=${selectedProjectId}`),
    enabled: Boolean(selectedProjectId),
  });
  const saveWorkLog = useMutation({
    mutationFn: (values: WorkLogFormValues) =>
      workLog
        ? workLogApi.update(workLog.id, values)
        : workLogApi.create(values),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: workLogQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success(message ?? 'Work log saved successfully.');
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        for (const [field, messages] of Object.entries(error.issues)) {
          const message = messages?.[0];
          if (message && field in form.getValues()) {
            form.setError(field as keyof WorkLogFormValues, { message });
          }
        }
      }

      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to save this work log.',
      );
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(valuesFromWorkLog(workLog, defaultClientId, defaultProjectId));
    }
  }, [defaultClientId, defaultProjectId, form, open, workLog]);

  const projects = useMemo(
    () => projectsQuery.data?.projects ?? [],
    [projectsQuery.data?.projects],
  );
  const clients = clientsQuery.data?.clients ?? [];

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    if (!projects.some((project) => project.id === selectedProjectId)) {
      form.setValue('projectId', '');
    }
  }, [form, projects, selectedProjectId]);

  const fieldError = (field: keyof WorkLogFormValues) =>
    form.formState.errors[field]?.message;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workLog ? 'Edit work log' : 'Create a work log'}
          </DialogTitle>
          <DialogDescription>
            Capture the work, date, hours, and billing status for a specific
            client project.
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-6 space-y-5"
          onSubmit={form.handleSubmit((values) => saveWorkLog.mutate(values))}
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
              error={fieldError('projectId')}
              label="Project"
              required
            >
              <Select {...form.register('projectId')}>
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl
              error={fieldError('title')}
              label="Work summary"
              required
            >
              <Input
                placeholder="Homepage QA and launch checklist"
                {...form.register('title')}
              />
            </FormControl>
            <FormControl error={fieldError('categoryId')} label="Category">
              <Select {...form.register('categoryId')}>
                <option value="">No category</option>
                {categoriesQuery.data?.categories
                  .filter((category) => category.active)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </Select>
            </FormControl>
            <FormControl
              error={fieldError('workDate')}
              label="Work date"
              required
            >
              <Input type="date" {...form.register('workDate')} />
            </FormControl>
            <div className="grid grid-cols-[1fr_150px] gap-3">
              <FormControl
                error={fieldError('durationHours')}
                label="Hours worked"
                required
              >
                <Input
                  inputMode="decimal"
                  min="0"
                  placeholder="2.5"
                  step="0.25"
                  type="number"
                  {...form.register('durationHours')}
                />
              </FormControl>
              <FormControl
                error={fieldError('billable')}
                label="Billing"
                required
              >
                <Select {...form.register('billable')}>
                  <option value="true">Billable</option>
                  <option value="false">Non-billable</option>
                </Select>
              </FormControl>
            </div>
          </div>

          <FormControl error={fieldError('tags')} label="Tags">
            <Input
              placeholder="frontend, launch, qa"
              {...form.register('tags')}
            />
          </FormControl>
          <FormControl error={fieldError('description')} label="Notes">
            <Textarea
              placeholder="Describe what you completed, decisions made, or blockers handled…"
              {...form.register('description')}
            />
          </FormControl>

          <DialogFooter>
            <Button
              disabled={saveWorkLog.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                saveWorkLog.isPending ||
                clients.length === 0 ||
                projects.length === 0
              }
              type="submit"
            >
              {saveWorkLog.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {saveWorkLog.isPending
                ? 'Saving…'
                : workLog
                  ? 'Save changes'
                  : 'Create work log'}
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
