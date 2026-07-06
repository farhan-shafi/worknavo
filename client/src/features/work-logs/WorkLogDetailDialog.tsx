import type { WorkLog, WorkLogLocationProof } from '@clientflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, ExternalLink, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { ApiError, apiAssetUrl } from '../../lib/api-client';
import { formatMoney } from '../projects/project.utils';
import { workLogApi } from './work-log.api';
import { formatHours, formatWorkLogDate } from './work-log.utils';

interface WorkLogDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workLog: WorkLog | null;
}

function mapUrl(location: WorkLogLocationProof) {
  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}

function proofPreviewUrl(fileUrl: string) {
  return apiAssetUrl(fileUrl.replace(/^\/api/, ''));
}

export function WorkLogDetailDialog({
  onOpenChange,
  open,
  workLog,
}: WorkLogDetailDialogProps) {
  const queryClient = useQueryClient();
  const screenshotProofs = useQuery({
    queryKey: ['screenshot-proofs', workLog?.id],
    queryFn: () => workLogApi.listScreenshotProofs(workLog?.id ?? ''),
    enabled: open && Boolean(workLog),
  });
  const deleteProof = useMutation({
    mutationFn: (proofId: string) =>
      workLog
        ? workLogApi.deleteScreenshotProof(workLog.id, proofId)
        : Promise.reject(new Error('No work log selected.')),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: ['screenshot-proofs'] });
      toast.success(message);
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Could not delete screenshot proof.',
      ),
  });

  if (!workLog) return null;

  const locations = [
    ['Timer start', workLog.timerStartLocation],
    ['Timer stop', workLog.timerStopLocation],
  ] as const;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workLog.title}</DialogTitle>
          <DialogDescription>
            Full work-log details, GPS proof, and screenshot proof.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <h3 className="font-extrabold">Work details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <DetailRow label="Client" value={workLog.client.name} />
              <DetailRow label="Project" value={workLog.project.name} />
              <DetailRow
                label="Date"
                value={formatWorkLogDate(workLog.workDate)}
              />
              <DetailRow
                label="Hours"
                value={formatHours(workLog.durationHours)}
              />
              <DetailRow
                label="Value"
                value={
                  workLog.billable
                    ? formatMoney(workLog.amount, workLog.currency)
                    : 'Non-billable'
                }
              />
              <DetailRow label="Entry mode" value={workLog.entryMode} />
              <DetailRow label="Category" value={workLog.category ?? 'None'} />
              <DetailRow
                label="Notes"
                value={workLog.description || 'No notes added'}
              />
            </dl>
          </Card>

          <Card className="p-4">
            <h3 className="font-extrabold">GPS proof</h3>
            <div className="mt-4 space-y-3">
              {locations.map(([label, location]) =>
                location ? (
                  <div
                    className="border-border rounded-2xl border p-3"
                    key={label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">{label}</p>
                      <Badge variant="success">
                        <MapPin className="size-3" /> Captured
                      </Badge>
                    </div>
                    <p className="text-muted mt-2 text-xs">
                      {location.latitude.toFixed(5)},{' '}
                      {location.longitude.toFixed(5)}
                      {location.accuracy
                        ? ` · ±${Math.round(location.accuracy)}m`
                        : ''}
                    </p>
                    <a
                      className="text-primary mt-2 inline-flex items-center gap-1 text-xs font-bold"
                      href={mapUrl(location)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open in map <ExternalLink className="size-3" />
                    </a>
                  </div>
                ) : null,
              )}
              {!workLog.timerStartLocation && !workLog.timerStopLocation ? (
                <p className="text-muted text-sm">
                  No GPS proof was captured for this entry.
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold">Screenshot proofs</h3>
              <p className="text-muted mt-1 text-sm">
                Screenshots are manual captures tied to the active timer.
              </p>
            </div>
            <Badge variant="neutral">
              {screenshotProofs.data?.total ?? 0} proof
              {(screenshotProofs.data?.total ?? 0) === 1 ? '' : 's'}
            </Badge>
          </div>

          {screenshotProofs.isLoading ? (
            <p className="text-muted mt-4 text-sm">Loading proofs…</p>
          ) : screenshotProofs.data?.screenshotProofs.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {screenshotProofs.data.screenshotProofs.map((proof) => (
                <div
                  className="border-border overflow-hidden rounded-2xl border"
                  key={proof.id}
                >
                  <img
                    alt="Screenshot proof"
                    className="bg-surface h-48 w-full object-cover"
                    src={proofPreviewUrl(proof.fileUrl)}
                  />
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div>
                      <p className="text-sm font-bold">
                        {new Date(proof.capturedAt).toLocaleString()}
                      </p>
                      <p className="text-muted text-xs">
                        {(proof.fileSize / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() =>
                          void workLogApi.downloadScreenshotProof(
                            workLog.id,
                            proof.id,
                          )
                        }
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Download className="size-4" />
                      </Button>
                      <Button
                        className="text-danger hover:bg-danger/5"
                        disabled={deleteProof.isPending}
                        onClick={() => deleteProof.mutate(proof.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted mt-4 text-sm">
              No screenshot proof was captured for this entry.
            </p>
          )}
        </Card>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
      <dt className="text-muted font-bold">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
