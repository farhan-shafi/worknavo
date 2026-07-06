import { zodResolver } from '@hookform/resolvers/zod';
import type { ScheduledReport } from '@clientflow/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  LoaderCircle,
  MailCheck,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { ApiError } from '../../lib/api-client';
import { useClients } from '../clients/client.queries';
import { scheduledReportApi } from './scheduled-report.api';
import {
  scheduledReportQueryKeys,
  useScheduledReports,
} from './scheduled-report.queries';
import {
  scheduledReportFormSchema,
  type ScheduledReportFormValues,
} from './scheduled-report.schemas';

function defaultValues(): ScheduledReportFormValues {
  return {
    name: '',
    clientId: '',
    frequency: 'weekly',
    recipients: '',
    subject: '',
    active: 'true',
    nextRunAt: '',
  };
}

function toDatetimeInput(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function valuesFromSchedule(
  scheduledReport: ScheduledReport,
): ScheduledReportFormValues {
  return {
    name: scheduledReport.name,
    clientId: scheduledReport.clientId ?? '',
    frequency: scheduledReport.frequency,
    recipients: scheduledReport.recipients.join('\n'),
    subject: scheduledReport.subject ?? '',
    active: scheduledReport.active ? 'true' : 'false',
    nextRunAt: toDatetimeInput(scheduledReport.nextRunAt),
  };
}

function formatDateTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not sent yet';
}

export function ScheduledReportsPanel() {
  const queryClient = useQueryClient();
  const [editingSchedule, setEditingSchedule] =
    useState<ScheduledReport | null>(null);
  const clientsQuery = useClients({ search: '', status: 'all' });
  const schedulesQuery = useScheduledReports();
  const clients = useMemo(
    () => clientsQuery.data?.clients ?? [],
    [clientsQuery.data?.clients],
  );
  const schedules = schedulesQuery.data?.scheduledReports ?? [];
  const form = useForm<ScheduledReportFormValues>({
    resolver: zodResolver(scheduledReportFormSchema),
    defaultValues: defaultValues(),
  });

  const saveSchedule = useMutation({
    mutationFn: (values: ScheduledReportFormValues) =>
      editingSchedule
        ? scheduledReportApi.update(editingSchedule.id, values)
        : scheduledReportApi.create(values),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({
        queryKey: scheduledReportQueryKeys.all,
      });
      toast.success(message ?? 'Scheduled report saved successfully.');
      setEditingSchedule(null);
      form.reset(defaultValues());
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        for (const [field, messages] of Object.entries(error.issues)) {
          const message = messages?.[0];
          if (message && field in form.getValues()) {
            form.setError(field as keyof ScheduledReportFormValues, {
              message,
            });
          }
        }
      }

      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to save this scheduled report.',
      );
    },
  });
  const deleteSchedule = useMutation({
    mutationFn: scheduledReportApi.delete,
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({
        queryKey: scheduledReportQueryKeys.all,
      });
      toast.success(message);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to delete this scheduled report.',
      );
    },
  });

  useEffect(() => {
    form.reset(
      editingSchedule ? valuesFromSchedule(editingSchedule) : defaultValues(),
    );
  }, [editingSchedule, form]);

  const fieldError = (field: keyof ScheduledReportFormValues) =>
    form.formState.errors[field]?.message;

  return (
    <Card className="mt-6 overflow-hidden">
      <div className="border-border flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
            Automation
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold">
            <CalendarClock className="size-5" /> Scheduled email reports
          </h2>
          <p className="text-muted mt-1 text-sm">
            Send daily, weekly, or monthly time summaries using your Resend/SMTP
            email setup.
          </p>
        </div>
        <Badge variant="primary">
          <MailCheck className="size-3.5" />
          {schedules.length} scheduled
        </Badge>
      </div>

      <div className="grid gap-0 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          className="border-border space-y-4 border-b p-5 xl:border-r xl:border-b-0"
          onSubmit={form.handleSubmit((values) => saveSchedule.mutate(values))}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-extrabold">
              {editingSchedule ? 'Edit schedule' : 'Create schedule'}
            </h3>
            {editingSchedule ? (
              <Button
                onClick={() => setEditingSchedule(null)}
                size="sm"
                type="button"
                variant="outline"
              >
                New
              </Button>
            ) : null}
          </div>

          <FormControl
            error={fieldError('name')}
            label="Schedule name"
            required
          >
            <Input
              placeholder="Weekly team summary"
              {...form.register('name')}
            />
          </FormControl>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormControl error={fieldError('clientId')} label="Client">
              <Select {...form.register('clientId')}>
                <option value="">All clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl
              error={fieldError('frequency')}
              label="Frequency"
              required
            >
              <Select {...form.register('frequency')}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </FormControl>
            <FormControl error={fieldError('active')} label="Status" required>
              <Select {...form.register('active')}>
                <option value="true">Active</option>
                <option value="false">Paused</option>
              </Select>
            </FormControl>
            <FormControl
              error={fieldError('nextRunAt')}
              label="Next run"
              note="Blank uses default"
            >
              <Input type="datetime-local" {...form.register('nextRunAt')} />
            </FormControl>
          </div>

          <FormControl
            error={fieldError('recipients')}
            label="Recipients"
            note="Comma or line separated"
            required
          >
            <Textarea
              placeholder={'client@example.com\nmanager@example.com'}
              rows={3}
              {...form.register('recipients')}
            />
          </FormControl>

          <FormControl error={fieldError('subject')} label="Subject override">
            <Input
              placeholder="Optional custom subject"
              {...form.register('subject')}
            />
          </FormControl>

          <Button disabled={saveSchedule.isPending} type="submit">
            {saveSchedule.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : editingSchedule ? (
              <Pencil className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {editingSchedule ? 'Save schedule' : 'Create schedule'}
          </Button>
        </form>

        <div className="space-y-3 p-5">
          {schedulesQuery.isLoading ? (
            <p className="text-muted text-sm">Loading schedules…</p>
          ) : schedules.length === 0 ? (
            <div className="bg-surface-strong rounded-2xl p-6 text-center">
              <CalendarClock className="text-muted mx-auto size-8" />
              <p className="mt-3 font-extrabold">No scheduled reports yet</p>
              <p className="text-muted mt-1 text-sm">
                Create one to email recurring time summaries automatically.
              </p>
            </div>
          ) : (
            schedules.map((schedule) => (
              <div
                className="border-border rounded-2xl border p-4"
                key={schedule.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold">{schedule.name}</p>
                      <Badge variant={schedule.active ? 'success' : 'neutral'}>
                        {schedule.active ? 'Active' : 'Paused'}
                      </Badge>
                      <Badge variant="neutral">{schedule.frequency}</Badge>
                    </div>
                    <p className="text-muted mt-1 text-sm">
                      {schedule.client?.name ?? 'All clients'} ·{' '}
                      {schedule.recipients.join(', ')}
                    </p>
                    <p className="text-muted mt-2 text-xs">
                      Next: {formatDateTime(schedule.nextRunAt)} · Last:{' '}
                      {formatDateTime(schedule.lastSentAt)}
                    </p>
                    {schedule.lastError ? (
                      <p className="text-danger mt-2 text-xs">
                        Last error: {schedule.lastError}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      onClick={() => setEditingSchedule(schedule)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      className="text-danger hover:bg-danger/5"
                      disabled={deleteSchedule.isPending}
                      onClick={() => deleteSchedule.mutate(schedule.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function FormControl({
  children,
  error,
  label,
  note,
  required = false,
}: {
  children: ReactNode;
  error?: string;
  label: string;
  note?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-bold">
          {label} {required ? <span className="text-danger">*</span> : null}
        </span>
        {note ? <span className="text-muted text-xs">{note}</span> : null}
      </div>
      {children}
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </label>
  );
}
