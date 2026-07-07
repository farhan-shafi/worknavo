import { zodResolver } from '@hookform/resolvers/zod';
import {
  planIncludes,
  type ScreenshotProof,
  type WorkLog,
  type WorkLogLocationProof,
} from '@clientflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  Camera,
  Download,
  LoaderCircle,
  MapPin,
  PauseCircle,
  PlayCircle,
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
import { ApiError, request } from '../../lib/api-client';
import { trackEvent } from '../../lib/analytics';
import { clientQueryKeys, useClients } from '../clients/client.queries';
import { useProjects } from '../projects/project.queries';
import { useAuth } from '../auth/use-auth';
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

async function captureLocationProof(): Promise<
  WorkLogLocationProof | undefined
> {
  if (!('geolocation' in navigator)) {
    toast.warning('GPS proof is not available in this browser.');
    return undefined;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
          capturedAt: new Date().toISOString(),
        });
      },
      () => {
        toast.warning('GPS proof was skipped.', {
          description:
            'Location permission was denied or unavailable. The timer will still work.',
        });
        resolve(undefined);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 8_000,
      },
    );
  });
}

async function captureScreenshotProof() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen capture is not available in this browser.');
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: false,
    video: true,
  });

  try {
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = stream;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Screenshot preview failed.'));
    });
    await video.play();

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Screenshot capture failed.');
    }

    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Screenshot capture failed.');
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return {
      capturedAt: new Date().toISOString(),
      imageDataUrl: canvas.toDataURL('image/jpeg', 0.55),
    };
  } finally {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }
}

export function WorkLogTimerPanel({
  activeTimer,
  defaultClientId,
}: WorkLogTimerPanelProps) {
  const { organization } = useAuth();
  const proofTrackingEnabled = planIncludes(
    organization?.subscriptionPlan,
    'proofTracking',
  );
  const queryClient = useQueryClient();
  const [gpsProofEnabled, setGpsProofEnabled] = useState(false);
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
    mutationFn: async (values: WorkLogTimerValues) => {
      const locationProof =
        gpsProofEnabled && proofTrackingEnabled
          ? await captureLocationProof()
          : undefined;
      return workLogApi.startTimer({
        ...values,
        ...(locationProof ? { locationProof } : {}),
      });
    },
    onSuccess: ({ message, workLog }) => {
      trackEvent('timer_started', {
        billable: workLog.billable,
        has_category: Boolean(workLog.categoryId),
        has_gps_proof: Boolean(workLog.timerStartLocation),
      });
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
    mutationFn: async () => {
      const locationProof =
        activeTimer?.timerStartLocation && proofTrackingEnabled
          ? await captureLocationProof()
          : undefined;
      return workLogApi.stopTimer({
        ...(locationProof ? { locationProof } : {}),
      });
    },
    onSuccess: ({ message, workLog }) => {
      trackEvent('timer_stopped', {
        billable: workLog.billable,
        duration_hours: workLog.durationHours,
        has_gps_proof: Boolean(workLog.timerStopLocation),
      });
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
  const screenshotProofs = useQuery({
    queryKey: ['screenshot-proofs', activeTimer?.id],
    queryFn: () => workLogApi.listScreenshotProofs(activeTimer?.id ?? ''),
    enabled: Boolean(activeTimer) && proofTrackingEnabled,
  });
  const captureScreenshot = useMutation({
    mutationFn: async () => {
      if (!activeTimer) throw new Error('No active timer.');
      return workLogApi.createScreenshotProof(
        activeTimer.id,
        await captureScreenshotProof(),
      );
    },
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: ['screenshot-proofs'] });
      toast.success(message ?? 'Screenshot proof captured.');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to capture screenshot proof.',
      );
    },
  });
  const deleteScreenshot = useMutation({
    mutationFn: ({
      proofId,
      workLogId,
    }: {
      proofId: string;
      workLogId: string;
    }) => workLogApi.deleteScreenshotProof(workLogId, proofId),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: ['screenshot-proofs'] });
      toast.success(message);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to delete screenshot proof.',
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
  const categoryRequired = organization?.workLogRequireCategory ?? false;
  const minimumNotesLength = Math.max(
    organization?.workLogRequireDescription ? 1 : 0,
    organization?.workLogMinimumDescriptionLength ?? 0,
  );

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
        captureScreenshotPending={captureScreenshot.isPending}
        deleteScreenshotPending={deleteScreenshot.isPending}
        proofTrackingEnabled={proofTrackingEnabled}
        onStop={() => stopTimer.mutate()}
        onCaptureScreenshot={() => captureScreenshot.mutate()}
        onDeleteScreenshot={(proof) =>
          deleteScreenshot.mutate({
            proofId: proof.id,
            workLogId: activeTimer.id,
          })
        }
        onDownloadScreenshot={(proof) =>
          void workLogApi.downloadScreenshotProof(activeTimer.id, proof.id)
        }
        pending={stopTimer.isPending}
        screenshotProofs={screenshotProofs.data?.screenshotProofs ?? []}
        screenshotProofsLoading={screenshotProofs.isLoading}
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
          required={categoryRequired}
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
          error={form.formState.errors.description?.message}
          label="Notes"
          required={minimumNotesLength > 0}
        >
          <Input
            placeholder={
              minimumNotesLength > 1
                ? `Required, ${minimumNotesLength}+ characters`
                : 'Optional notes'
            }
            {...form.register('description')}
          />
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
        <label className="border-border bg-surface flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm lg:col-span-full">
          <input
            checked={gpsProofEnabled}
            className="accent-primary mt-1"
            disabled={!proofTrackingEnabled}
            onChange={(event) => setGpsProofEnabled(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="flex items-center gap-1.5 font-extrabold">
              <MapPin className="size-4" /> Save GPS proof for this timer
            </span>
            <span className="text-muted mt-1 block text-xs leading-5">
              {proofTrackingEnabled
                ? 'Browser permission is requested only when you start and stop the timer. No background tracking is used.'
                : 'Upgrade to Pro to capture GPS proof. Timers still work without proof tracking.'}
            </span>
          </span>
        </label>
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
  captureScreenshotPending,
  deleteScreenshotPending,
  onCaptureScreenshot,
  onDeleteScreenshot,
  onDownloadScreenshot,
  onStop,
  pending,
  proofTrackingEnabled,
  screenshotProofs,
  screenshotProofsLoading,
}: {
  activeTimer: WorkLog;
  captureScreenshotPending: boolean;
  deleteScreenshotPending: boolean;
  onCaptureScreenshot: () => void;
  onDeleteScreenshot: (proof: ScreenshotProof) => void;
  onDownloadScreenshot: (proof: ScreenshotProof) => void;
  onStop: () => void;
  pending: boolean;
  proofTrackingEnabled: boolean;
  screenshotProofs: ScreenshotProof[];
  screenshotProofsLoading: boolean;
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
          {activeTimer.timerStartLocation ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white/55">
              <MapPin className="size-3.5" /> GPS proof active for start/stop
            </p>
          ) : null}
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
          {proofTrackingEnabled ? (
            <Button
              className="min-w-44"
              disabled={captureScreenshotPending}
              onClick={onCaptureScreenshot}
              type="button"
              variant="outline"
            >
              {captureScreenshotPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              {captureScreenshotPending ? 'Capturing…' : 'Screenshot proof'}
            </Button>
          ) : null}
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
      {proofTrackingEnabled ? (
        <div className="border-t border-white/10 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold">Screenshot proofs</p>
              <p className="mt-1 text-xs text-white/55">
                Manual capture only. The browser picker appears every time; no
                silent screenshots.
              </p>
            </div>
            <Badge variant="dark">
              {screenshotProofs.length} proof
              {screenshotProofs.length === 1 ? '' : 's'}
            </Badge>
          </div>
          {screenshotProofsLoading ? (
            <p className="mt-3 text-xs text-white/55">Loading proofs…</p>
          ) : screenshotProofs.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {screenshotProofs.map((proof) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  key={proof.id}
                >
                  <div>
                    <p className="text-xs font-bold">
                      {new Date(proof.capturedAt).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-white/50">
                      {(proof.fileSize / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => onDownloadScreenshot(proof)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Download className="size-4" />
                    </Button>
                    <Button
                      className="text-danger hover:bg-danger/10"
                      disabled={deleteScreenshotPending}
                      onClick={() => onDeleteScreenshot(proof)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-white/55">
              No screenshot proof captured for this timer yet.
            </p>
          )}
        </div>
      ) : (
        <div className="border-t border-white/10 px-6 py-4">
          <p className="text-sm font-extrabold">Screenshot and GPS proofs</p>
          <p className="mt-1 text-xs text-white/55">
            Proof tracking is available on the Pro plan. The timer remains fully
            usable on Free and Team.
          </p>
        </div>
      )}
    </Card>
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
