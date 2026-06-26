import type { Invoice } from '@clientflow/shared';
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
import { workLogQueryKeys } from '../work-logs/work-log.queries';
import { invoiceApi } from './invoice.api';
import { invoiceQueryKeys } from './invoice.queries';

interface InvoiceDeleteDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDeleteDialog({
  invoice,
  onOpenChange,
  open,
}: InvoiceDeleteDialogProps) {
  const queryClient = useQueryClient();
  const deleteInvoice = useMutation({
    mutationFn: () => invoiceApi.delete(invoice?.id ?? ''),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: workLogQueryKeys.all });
      toast.success(message);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to delete this invoice.',
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
          <DialogTitle>
            Delete {invoice?.invoiceNumber ?? 'this invoice'}?
          </DialogTitle>
          <DialogDescription>
            This removes the invoice and releases any linked work logs back into
            the available billing pool.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleteInvoice.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={deleteInvoice.isPending}
            onClick={() => deleteInvoice.mutate()}
            variant="danger"
          >
            {deleteInvoice.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {deleteInvoice.isPending ? 'Deleting…' : 'Delete invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
