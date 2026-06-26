import type { Client } from '@clientflow/shared';
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
import { clientApi } from './client.api';
import { clientQueryKeys } from './client.queries';

interface ClientDeleteDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function ClientDeleteDialog({
  client,
  onDeleted,
  onOpenChange,
  open,
}: ClientDeleteDialogProps) {
  const queryClient = useQueryClient();
  const deleteClient = useMutation({
    mutationFn: () => clientApi.delete(client?.id ?? ''),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success(message);
      onOpenChange(false);
      onDeleted?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to delete this client.',
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
          <DialogTitle>Delete {client?.name ?? 'this client'}?</DialogTitle>
          <DialogDescription>
            This permanently removes the client from your workspace. Clients
            with linked projects must have those projects deleted or moved
            first.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleteClient.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={deleteClient.isPending}
            onClick={() => deleteClient.mutate()}
            variant="danger"
          >
            {deleteClient.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {deleteClient.isPending ? 'Deleting…' : 'Delete client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
