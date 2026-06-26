import type { WeeklyReport } from '@clientflow/shared';
import {
  Download,
  LoaderCircle,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../../components/ui/button';
import { ApiError } from '../../lib/api-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { reportApi } from './report.api';

export function ReportActions({
  onDelete,
  onEdit,
  report,
}: {
  onDelete: () => void;
  onEdit: () => void;
  report: WeeklyReport;
}) {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  const downloadPdf = async () => {
    setDownloading(true);

    try {
      await reportApi.downloadPdf(report.id, `${report.title}.pdf`);
      toast.success('Report PDF downloaded.');
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to download this report.',
      );
    } finally {
      setDownloading(false);
    }
  };

  const sendEmail = async () => {
    setSending(true);

    try {
      const result = await reportApi.sendEmail(report.id);
      toast.success(result.message);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to email this report.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button disabled={sending} onClick={() => void sendEmail()} size="sm">
        {sending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Mail className="size-4" />
        )}
        Email
      </Button>
      <Button
        disabled={downloading}
        onClick={() => void downloadPdf()}
        size="sm"
        variant="secondary"
      >
        {downloading ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Download PDF
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Actions for ${report.title}`}
            size="icon"
            variant="ghost"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={sending}
            onSelect={() => void sendEmail()}
          >
            <Mail className="size-4" /> Email to client
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={downloading}
            onSelect={() => void downloadPdf()}
          >
            <Download className="size-4" /> Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-4" /> Edit report
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-danger data-[highlighted]:bg-danger/5"
            onSelect={onDelete}
          >
            <Trash2 className="size-4" /> Delete report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
