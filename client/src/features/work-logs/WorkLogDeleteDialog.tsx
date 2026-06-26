import type { WorkLog } from '@clientflow/shared';
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
import { clientQueryKeys } from '../clients/client.queries';
import { workLogApi } from './work-log.api';
import { workLogQueryKeys } from './work-log.queries';

interface WorkLogDeleteDialogProps {
  workLog: WorkLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkLogDeleteDialog({
  onOpenChange,
  open,
  workLog,
}: WorkLogDeleteDialogProps) {
  const queryClient = useQueryClient();
  const deleteWorkLog = useMutation({
    mutationFn: () => workLogApi.delete(workLog?.id ?? ''),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: workLogQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success(message);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to delete this work log.',
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
          <DialogTitle>Delete {workLog?.title ?? 'this work log'}?</DialogTitle>
          <DialogDescription>
            This permanently removes the saved work entry and its billing
            history from the current workspace.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleteWorkLog.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={deleteWorkLog.isPending}
            onClick={() => deleteWorkLog.mutate()}
            variant="danger"
          >
            {deleteWorkLog.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {deleteWorkLog.isPending ? 'Deleting…' : 'Delete work log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
