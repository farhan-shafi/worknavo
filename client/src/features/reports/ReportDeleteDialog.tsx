import type { WeeklyReport } from '@clientflow/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
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
import { ApiError } from '../../lib/api-client';
import { reportApi } from './report.api';
import { reportQueryKeys } from './report.queries';

interface ReportDeleteDialogProps {
  report: WeeklyReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDeleteDialog({
  onOpenChange,
  open,
  report,
}: ReportDeleteDialogProps) {
  const queryClient = useQueryClient();
  const deleteReport = useMutation({
    mutationFn: () => reportApi.delete(report?.id ?? ''),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: reportQueryKeys.all });
      toast.success(message);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to delete this report.',
      );
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <span className="bg-danger/8 text-danger mb-4 grid size-11 place-items-center rounded-2xl">
            <AlertTriangle className="size-5" />
          </span>
          <DialogTitle>Delete {report?.title ?? 'this report'}?</DialogTitle>
          <DialogDescription>
            This permanently removes the weekly report from your workspace. The
            source work logs stay intact.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleteReport.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={deleteReport.isPending}
            onClick={() => deleteReport.mutate()}
            variant="danger"
          >
            {deleteReport.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {deleteReport.isPending ? 'Deleting…' : 'Delete report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
