import type { WorkLog } from '@clientflow/shared';
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

export function WorkLogActions({
  onDelete,
  onDuplicate,
  onEdit,
  workLog,
}: {
  onDelete: () => void;
  onDuplicate?: () => void;
  onEdit: () => void;
  workLog: WorkLog;
}) {
  const lockedByInvoice = Boolean(workLog.invoiceId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Actions for ${workLog.title}`}
          size="icon"
          variant="ghost"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {lockedByInvoice ? (
          <>
            <DropdownMenuLabel>Linked to an invoice</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {onDuplicate ? (
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy className="size-4" /> Duplicate entry
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem disabled={lockedByInvoice} onSelect={onEdit}>
          <Pencil className="size-4" /> Edit work log
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-danger data-[highlighted]:bg-danger/5"
          disabled={lockedByInvoice}
          onSelect={onDelete}
        >
          <Trash2 className="size-4" /> Delete work log
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
