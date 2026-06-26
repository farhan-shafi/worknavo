import type { ClientDocument } from '../../models/Client.model.js';
import type { InvoiceDocument } from '../../models/Invoice.model.js';
import type { OrganizationDocument } from '../../models/Organization.model.js';
import type { WeeklyReportDocument } from '../../models/WeeklyReport.model.js';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function senderName(organization: OrganizationDocument) {
  return organization.name;
}

function clientName(client: ClientDocument) {
  return client.name.trim();
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function emailShell(content: string, organization: OrganizationDocument) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f7f8;color:#17212b;font-family:Arial,sans-serif">
    <div style="max-width:620px;margin:0 auto;padding:32px 16px">
      <div style="background:#ffffff;border:1px solid #dce3e8;border-radius:14px;overflow:hidden">
        <div style="background:#17212b;padding:22px 28px;color:#ffffff">
          <strong style="font-size:20px">${escapeHtml(senderName(organization))}</strong>
        </div>
        <div style="padding:30px 28px;line-height:1.65">${content}</div>
      </div>
      <p style="color:#667581;font-size:12px;text-align:center;margin:18px 0 0">
        Sent with ClientFlow
      </p>
    </div>
  </body>
</html>`;
}

export function weeklyReportEmailTemplate({
  client,
  report,
  organization,
}: {
  client: ClientDocument;
  report: WeeklyReportDocument;
  organization: OrganizationDocument;
}) {
  const subject = `${report.title} — ${senderName(organization)}`;
  const text = [
    `Hi ${clientName(client)},`,
    '',
    `Please find attached ${report.title}, covering ${formatDate(report.weekStart)} to ${formatDate(report.weekEnd)}.`,
    '',
    report.summary,
    '',
    `Regards,`,
    senderName(organization),
  ].join('\n');
  const html = emailShell(
    `<p>Hi ${escapeHtml(clientName(client))},</p>
     <p>Please find attached <strong>${escapeHtml(report.title)}</strong>, covering
     ${escapeHtml(formatDate(report.weekStart))} to ${escapeHtml(formatDate(report.weekEnd))}.</p>
     <div style="background:#fff0e9;border-radius:10px;padding:16px 18px;margin:22px 0">
       ${escapeHtml(report.summary)}
     </div>
     <p>Regards,<br><strong>${escapeHtml(senderName(organization))}</strong></p>`,
    organization,
  );

  return { html, subject, text };
}

export function invoiceEmailTemplate({
  client,
  invoice,
  organization,
}: {
  client: ClientDocument;
  invoice: InvoiceDocument;
  organization: OrganizationDocument;
}) {
  const amount = new Intl.NumberFormat('en-US', {
    currency: invoice.currency,
    currencyDisplay: 'code',
    style: 'currency',
  }).format(invoice.total);
  const subject = `${invoice.invoiceNumber} from ${senderName(organization)}`;
  const text = [
    `Hi ${clientName(client)},`,
    '',
    `Please find attached invoice ${invoice.invoiceNumber} for ${amount}.`,
    `Payment is due by ${formatDate(invoice.dueDate)}.`,
    '',
    `Thank you,`,
    senderName(organization),
  ].join('\n');
  const html = emailShell(
    `<p>Hi ${escapeHtml(clientName(client))},</p>
     <p>Please find attached invoice <strong>${escapeHtml(invoice.invoiceNumber)}</strong>.</p>
     <div style="background:#fff0e9;border-radius:10px;padding:18px;margin:22px 0">
       <div style="color:#667581;font-size:12px;text-transform:uppercase">Amount due</div>
       <div style="color:#e35d22;font-size:26px;font-weight:bold;margin-top:4px">${escapeHtml(amount)}</div>
       <div style="color:#667581;font-size:13px;margin-top:6px">Due ${escapeHtml(formatDate(invoice.dueDate))}</div>
     </div>
     <p>Thank you,<br><strong>${escapeHtml(senderName(organization))}</strong></p>`,
    organization,
  );

  return { html, subject, text };
}
