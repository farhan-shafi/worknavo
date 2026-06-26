import type { Invoice } from '@clientflow/shared';
import { CalendarDays, CheckCircle2, FileText, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { formatMoney } from '../projects/project.utils';
import { InvoiceActions } from './InvoiceActions';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { formatInvoiceDate } from './invoice.utils';

export function InvoiceCard({
  invoice,
  onDelete,
  onEdit,
  onMarkPaid,
}: {
  invoice: Invoice;
  onDelete: () => void;
  onEdit: () => void;
  onMarkPaid: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            <Badge variant="neutral">{invoice.items.length} items</Badge>
            {invoice.linkedWorkLogCount > 0 ? (
              <Badge variant="neutral">
                <Link2 className="size-3" />
                {invoice.linkedWorkLogCount} linked logs
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-extrabold">{invoice.invoiceNumber}</h3>
            <p className="text-primary text-lg font-extrabold">
              {formatMoney(invoice.total, invoice.currency)}
            </p>
          </div>

          <p className="text-muted mt-1 text-sm">
            <Link
              className="text-foreground hover:text-primary font-bold transition"
              to={`/app/clients/${invoice.clientId}`}
            >
              {invoice.client.companyName
                ? `${invoice.client.name} · ${invoice.client.companyName}`
                : invoice.client.name}
            </Link>
          </p>

          <div className="text-muted mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Issued {formatInvoiceDate(invoice.issueDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Due {formatInvoiceDate(invoice.dueDate)}
            </span>
            {invoice.paidAt ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                Paid {formatInvoiceDate(invoice.paidAt)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-start gap-2">
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' ? (
            <Button onClick={onMarkPaid} size="sm" variant="secondary">
              <CheckCircle2 className="size-4" /> Mark paid
            </Button>
          ) : null}
          <InvoiceActions
            invoice={invoice}
            onDelete={onDelete}
            onEdit={onEdit}
            onMarkPaid={onMarkPaid}
          />
        </div>
      </div>

      <div className="border-border border-t px-5 py-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCell
            label="Subtotal"
            value={formatMoney(invoice.subtotal, invoice.currency)}
          />
          <SummaryCell
            label="Discount"
            value={formatMoney(invoice.discount, invoice.currency)}
          />
          <SummaryCell
            label="Tax"
            value={formatMoney(invoice.taxAmount, invoice.currency)}
          />
          <SummaryCell
            label="Total"
            value={formatMoney(invoice.total, invoice.currency)}
          />
        </div>

        {invoice.notes ? (
          <p className="text-muted mt-4 line-clamp-3 text-sm leading-6">
            {invoice.notes}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          {invoice.items.slice(0, 3).map((item, index) => (
            <div
              className="flex items-center justify-between gap-3 text-sm"
              key={`${item.description}-${index}`}
            >
              <span className="min-w-0 truncate">{item.description}</span>
              <span className="shrink-0 font-semibold">
                {formatMoney(item.amount, invoice.currency)}
              </span>
            </div>
          ))}
          {invoice.items.length > 3 ? (
            <p className="text-muted text-xs">
              +{invoice.items.length - 3} more item
              {invoice.items.length - 3 === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>

        <div className="text-muted mt-4 flex items-center gap-1.5 text-xs">
          <FileText className="size-3.5" />
          Updated {formatInvoiceDate(invoice.updatedAt)}
        </div>
      </div>
    </Card>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-muted text-[11px] font-bold uppercase">{label}</p>
      <p className="mt-1 font-extrabold">{value}</p>
    </div>
  );
}
