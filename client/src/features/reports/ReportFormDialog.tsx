import { zodResolver } from '@hookform/resolvers/zod';
import type { WeeklyReport } from '@clientflow/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { ApiError } from '../../lib/api-client';
import { clientQueryKeys, useClients } from '../clients/client.queries';
import { reportApi } from './report.api';
import { reportFormSchema, type ReportFormValues } from './report.schemas';
import { reportQueryKeys } from './report.queries';
import { currentWeekRange, dateInputValue } from './report.utils';

interface ReportFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report?: WeeklyReport | null;
  defaultClientId?: string;
}

function valuesFromReport(
  report: WeeklyReport | null | undefined,
  defaultClientId: string | undefined,
): ReportFormValues {
  const currentWeek = currentWeekRange();

  if (!report) {
    return {
      clientId: defaultClientId ?? '',
      title: '',
      weekStart: currentWeek.weekStart,
      weekEnd: currentWeek.weekEnd,
      summary: '',
      highlights: '',
      status: 'draft',
    };
  }

  return {
    clientId: report.clientId,
    title: report.title,
    weekStart: dateInputValue(report.weekStart),
    weekEnd: dateInputValue(report.weekEnd),
    summary: report.summary,
    highlights: report.highlights.join('\n'),
    status: report.status,
  };
}

export function ReportFormDialog({
  defaultClientId,
  onOpenChange,
  open,
  report,
}: ReportFormDialogProps) {
  const queryClient = useQueryClient();
  const clientsQuery = useClients({ search: '', status: 'all' });
  const clients = useMemo(
    () => clientsQuery.data?.clients ?? [],
    [clientsQuery.data?.clients],
  );
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: valuesFromReport(report, defaultClientId),
  });

  const saveReport = useMutation({
    mutationFn: (values: ReportFormValues) =>
      report ? reportApi.update(report.id, values) : reportApi.create(values),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: reportQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success(message ?? 'Report saved successfully.');
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        for (const [field, messages] of Object.entries(error.issues)) {
          const message = messages?.[0];
          if (message && field in form.getValues()) {
            form.setError(field as keyof ReportFormValues, { message });
          }
        }
      }

      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to save this report.',
      );
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(valuesFromReport(report, defaultClientId ?? clients[0]?.id));
    }
  }, [clients, defaultClientId, form, open, report]);

  const fieldError = (field: keyof ReportFormValues) =>
    form.formState.errors[field]?.message;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {report ? 'Edit report' : 'Create a report'}
          </DialogTitle>
          <DialogDescription>
            Capture a weekly summary from the logged work and mark it final when
            it is ready to share.
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-6 space-y-5"
          onSubmit={form.handleSubmit((values) => saveReport.mutate(values))}
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
            <FormControl error={fieldError('status')} label="Status" required>
              <Select {...form.register('status')}>
                <option value="draft">Draft</option>
                <option value="final">Final</option>
              </Select>
            </FormControl>
            <FormControl
              error={fieldError('title')}
              label="Report title"
              required
            >
              <Input
                placeholder="Weekly client update"
                {...form.register('title')}
              />
            </FormControl>
            <FormControl
              error={fieldError('weekStart')}
              label="Week start"
              required
            >
              <Input type="date" {...form.register('weekStart')} />
            </FormControl>
            <FormControl
              error={fieldError('weekEnd')}
              label="Week end"
              required
            >
              <Input type="date" {...form.register('weekEnd')} />
            </FormControl>
          </div>

          <FormControl error={fieldError('summary')} label="Summary">
            <Textarea
              placeholder="Leave blank and we will auto-generate a summary from the selected work logs."
              {...form.register('summary')}
            />
          </FormControl>

          <FormControl
            error={fieldError('highlights')}
            label="Highlights"
            note="One highlight per line, up to 8."
          >
            <Textarea
              placeholder={
                'Delivered homepage redesign\nReviewed launch feedback\nPrepared next sprint plan'
              }
              {...form.register('highlights')}
            />
          </FormControl>

          <DialogFooter>
            <Button
              disabled={saveReport.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={saveReport.isPending || clients.length === 0}
              type="submit"
            >
              {saveReport.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {saveReport.isPending
                ? 'Saving…'
                : report
                  ? 'Save changes'
                  : 'Create report'}
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
