import type { WorkLog } from '@clientflow/shared';
import {
  CheckCircle2,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';

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
  onApprove,
  onReject,
  onSubmitApproval,
  onView,
  workLog,
}: {
  onDelete: () => void;
  onDuplicate?: () => void;
  onEdit: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onSubmitApproval?: () => void;
  onView?: () => void;
  workLog: WorkLog;
}) {
  const lockedByInvoice = Boolean(workLog.invoiceId);
  const lockedByApproval = workLog.approvalStatus === 'approved';
  const editLocked = lockedByInvoice || lockedByApproval;

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
        {onView ? (
          <DropdownMenuItem onSelect={onView}>
            <Eye className="size-4" /> View details
          </DropdownMenuItem>
        ) : null}
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
        {onSubmitApproval &&
        ['draft', 'rejected'].includes(workLog.approvalStatus) ? (
          <DropdownMenuItem onSelect={onSubmitApproval}>
            <Send className="size-4" /> Submit for approval
          </DropdownMenuItem>
        ) : null}
        {onApprove && workLog.approvalStatus !== 'approved' ? (
          <DropdownMenuItem onSelect={onApprove}>
            <CheckCircle2 className="size-4" /> Approve
          </DropdownMenuItem>
        ) : null}
        {onReject && workLog.approvalStatus !== 'rejected' ? (
          <DropdownMenuItem onSelect={onReject}>
            <XCircle className="size-4" /> Reject
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem disabled={editLocked} onSelect={onEdit}>
          <Pencil className="size-4" /> Edit work log
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-danger data-[highlighted]:bg-danger/5"
          disabled={editLocked}
          onSelect={onDelete}
        >
          <Trash2 className="size-4" /> Delete work log
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
