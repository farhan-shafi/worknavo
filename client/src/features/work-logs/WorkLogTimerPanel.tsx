import { zodResolver } from '@hookform/resolvers/zod';
import type { WorkLog } from '@clientflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { LoaderCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { ApiError, request } from '../../lib/api-client';
import { clientQueryKeys, useClients } from '../clients/client.queries';
import { useProjects } from '../projects/project.queries';
import { workLogApi } from './work-log.api';
import { workLogQueryKeys } from './work-log.queries';
import {
  workLogTimerSchema,
  type WorkLogTimerValues,
} from './work-log.schemas';
import { formatElapsedDuration } from './work-log.utils';

interface WorkLogTimerPanelProps {
  activeTimer: WorkLog | null;
  defaultClientId?: string;
}

function defaultValues(defaultClientId?: string): WorkLogTimerValues {
  return {
    clientId: defaultClientId ?? '',
    projectId: '',
    title: '',
    description: '',
    categoryId: '',
    tags: '',
    billable: 'true',
  };
}

export function WorkLogTimerPanel({
  activeTimer,
  defaultClientId,
}: WorkLogTimerPanelProps) {
  const queryClient = useQueryClient();
  const clientsQuery = useClients({ search: '', status: 'all' });
  const form = useForm<WorkLogTimerValues>({
    resolver: zodResolver(workLogTimerSchema),
    defaultValues: defaultValues(defaultClientId),
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
  const startTimer = useMutation({
    mutationFn: (values: WorkLogTimerValues) => workLogApi.startTimer(values),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: workLogQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success(message);
      form.reset(defaultValues(defaultClientId));
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        for (const [field, messages] of Object.entries(error.issues)) {
          const message = messages?.[0];
          if (message && field in form.getValues()) {
            form.setError(field as keyof WorkLogTimerValues, { message });
          }
        }
      }

      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to start the timer.',
      );
    },
  });
  const stopTimer = useMutation({
    mutationFn: () => workLogApi.stopTimer(),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: workLogQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success(message);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to stop the timer.',
      );
    },
  });

  useEffect(() => {
    form.reset(defaultValues(defaultClientId));
  }, [defaultClientId, form]);

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

  if (activeTimer) {
    return (
      <RunningTimerCard
        activeTimer={activeTimer}
        onStop={() => stopTimer.mutate()}
        pending={stopTimer.isPending}
      />
    );
  }

  return (
    <Card className="border-primary/15 mt-4 overflow-hidden bg-white">
      <div className="border-border flex items-start justify-between gap-4 border-b px-6 py-5">
        <div>
          <h2 className="flex items-center gap-2 font-extrabold">
            <PlayCircle className="text-primary size-5" />
            Start a live timer
          </h2>
          <p className="text-muted mt-1 text-sm">
            Work start karte hi timer chala do, stop par entry khud save ho
            jayegi.
          </p>
        </div>
        <Badge variant="primary">Live tracking</Badge>
      </div>

      <form
        className="grid gap-4 px-6 py-5 lg:grid-cols-[1.1fr_1fr_1fr_160px_auto]"
        onSubmit={form.handleSubmit((values) => startTimer.mutate(values))}
      >
        {defaultClientId ? null : (
          <FormControl
            error={form.formState.errors.clientId?.message}
            label="Client"
          >
            <Select {...form.register('clientId')}>
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </FormControl>
        )}
        <FormControl
          error={form.formState.errors.projectId?.message}
          label="Project"
        >
          <Select {...form.register('projectId')}>
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl
          error={form.formState.errors.title?.message}
          label="Task title"
        >
          <Input placeholder="Homepage revisions" {...form.register('title')} />
        </FormControl>
        <FormControl
          error={form.formState.errors.categoryId?.message}
          label="Category"
        >
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
          error={form.formState.errors.billable?.message}
          label="Billing"
        >
          <Select {...form.register('billable')}>
            <option value="true">Billable</option>
            <option value="false">Non-billable</option>
          </Select>
        </FormControl>
        <div className="lg:self-end">
          <Button
            className="w-full"
            disabled={
              startTimer.isPending ||
              clients.length === 0 ||
              projects.length === 0
            }
            type="submit"
          >
            {startTimer.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <PlayCircle className="size-4" />
            )}
            {startTimer.isPending ? 'Starting…' : 'Start timer'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function RunningTimerCard({
  activeTimer,
  onStop,
  pending,
}: {
  activeTimer: WorkLog;
  onStop: () => void;
  pending: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const startedAt = new Date(
    activeTimer.timerStartedAt ?? activeTimer.createdAt,
  );
  const elapsed = formatElapsedDuration(now - startedAt.getTime());

  return (
    <Card className="border-primary/20 bg-foreground mt-4 overflow-hidden text-white">
      <div className="bg-primary/20 flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="bg-success size-2 rounded-full" />
          <p className="text-sm font-extrabold tracking-[0.18em] uppercase">
            Timer running
          </p>
        </div>
        <Badge variant="dark">
          {activeTimer.billable ? 'Billable' : 'Non-billable'}
        </Badge>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr_auto] lg:items-center">
        <div className="min-w-0">
          <p className="truncate text-2xl font-extrabold">
            {activeTimer.title}
          </p>
          <p className="mt-2 text-sm text-white/65">
            {activeTimer.client.name} · {activeTimer.project.name}
          </p>
          <p className="mt-3 text-xs font-semibold text-white/55">
            Started {formatDistanceToNowStrict(startedAt, { addSuffix: true })}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-white/50 uppercase">
            Elapsed
          </p>
          <p className="mt-2 text-4xl font-extrabold tracking-[-0.05em]">
            {elapsed}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className="min-w-36"
            disabled={pending}
            onClick={onStop}
            type="button"
            variant="secondary"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <PauseCircle className="size-4" />
            )}
            {pending ? 'Stopping…' : 'Stop timer'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FormControl({
  children,
  error,
  label,
}: {
  children: ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      {children}
      {error ? (
        <span className="text-danger mt-1.5 block text-xs font-semibold">
          {error}
        </span>
      ) : null}
    </label>
  );
}
