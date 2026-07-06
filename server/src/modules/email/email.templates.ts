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
        Sent with WorkNavo
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

export interface ScheduledSummaryEmailData {
  organization: OrganizationDocument;
  reportName: string;
  periodLabel: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  topProjects: Array<{
    name: string;
    hours: number;
  }>;
  recentWork: Array<{
    title: string;
    projectName: string;
    hours: number;
  }>;
}

export function scheduledSummaryEmailTemplate({
  organization,
  reportName,
  periodLabel,
  totalHours,
  billableHours,
  nonBillableHours,
  topProjects,
  recentWork,
}: ScheduledSummaryEmailData) {
  const subject = `${reportName} — ${periodLabel}`;
  const projectRows = topProjects.length
    ? topProjects
        .map(
          (project) =>
            `<tr>
              <td style="padding:10px 0;border-bottom:1px solid #edf1f4">${escapeHtml(project.name)}</td>
              <td style="padding:10px 0;border-bottom:1px solid #edf1f4;text-align:right;font-weight:bold">${project.hours.toFixed(2)}h</td>
            </tr>`,
        )
        .join('')
    : `<tr><td colspan="2" style="padding:12px 0;color:#667581">No project time was logged in this period.</td></tr>`;
  const workRows = recentWork.length
    ? recentWork
        .map(
          (work) =>
            `<li style="margin:0 0 8px">
              <strong>${escapeHtml(work.title)}</strong>
              <span style="color:#667581"> — ${escapeHtml(work.projectName)}, ${work.hours.toFixed(2)}h</span>
            </li>`,
        )
        .join('')
    : `<li style="color:#667581">No completed work logs were found.</li>`;
  const text = [
    reportName,
    periodLabel,
    '',
    `Total hours: ${totalHours.toFixed(2)}h`,
    `Billable hours: ${billableHours.toFixed(2)}h`,
    `Non-billable hours: ${nonBillableHours.toFixed(2)}h`,
    '',
    'Top projects:',
    ...(topProjects.length
      ? topProjects.map(
          (project) => `- ${project.name}: ${project.hours.toFixed(2)}h`,
        )
      : ['- No project time was logged.']),
    '',
    `Sent by ${senderName(organization)} via WorkNavo.`,
  ].join('\n');
  const html = emailShell(
    `<p style="margin-top:0;color:#667581">Scheduled summary for <strong>${escapeHtml(periodLabel)}</strong>.</p>
     <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25">${escapeHtml(reportName)}</h1>
     <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:22px 0">
       <div style="background:#fff0e9;border-radius:12px;padding:14px">
         <div style="color:#667581;font-size:11px;text-transform:uppercase">Total</div>
         <div style="font-size:22px;font-weight:bold;color:#e35d22">${totalHours.toFixed(2)}h</div>
       </div>
       <div style="background:#f5f7f8;border-radius:12px;padding:14px">
         <div style="color:#667581;font-size:11px;text-transform:uppercase">Billable</div>
         <div style="font-size:22px;font-weight:bold">${billableHours.toFixed(2)}h</div>
       </div>
       <div style="background:#f5f7f8;border-radius:12px;padding:14px">
         <div style="color:#667581;font-size:11px;text-transform:uppercase">Non-billable</div>
         <div style="font-size:22px;font-weight:bold">${nonBillableHours.toFixed(2)}h</div>
       </div>
     </div>
     <h2 style="font-size:16px;margin:24px 0 8px">Project breakdown</h2>
     <table style="border-collapse:collapse;width:100%;font-size:14px">${projectRows}</table>
     <h2 style="font-size:16px;margin:24px 0 8px">Recent work</h2>
     <ul style="margin:0;padding-left:18px">${workRows}</ul>`,
    organization,
  );

  return { html, subject, text };
}
