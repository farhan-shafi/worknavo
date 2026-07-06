import type { Currency } from '@clientflow/shared';
import PDFDocument from 'pdfkit';

import type { ClientDocument } from '../models/Client.model.js';
import type { InvoiceDocument } from '../models/Invoice.model.js';
import type { OrganizationDocument } from '../models/Organization.model.js';
import type { WeeklyReportDocument } from '../models/WeeklyReport.model.js';

const colors = {
  accent: '#E35D22',
  accentSoft: '#FFF0E9',
  border: '#DCE3E8',
  dark: '#17212B',
  muted: '#667581',
  pale: '#F5F7F8',
  success: '#197A55',
  white: '#FFFFFF',
};

const page = {
  bottom: 54,
  left: 48,
  right: 48,
  top: 48,
};

type PdfDocument = InstanceType<typeof PDFDocument>;

interface InvoiceTableLayout {
  amountX: number;
  amountWidth: number;
  descriptionWidth: number;
  descriptionX: number;
  hoursX: number;
  hoursWidth: number;
  rateX: number;
  rateWidth: number;
  tableWidth: number;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(amount);
}

function businessName(organization: OrganizationDocument) {
  return organization.name;
}

function clientDisplayName(client: ClientDocument) {
  return client.companyName?.trim() || client.name;
}

function statusLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function contentWidth(document: PdfDocument) {
  return document.page.width - page.left - page.right;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function addPage(document: PdfDocument) {
  document.addPage();
  document.y = page.top;
}

function ensureSpace(document: PdfDocument, height: number) {
  const limit = document.page.height - page.bottom - 26;
  if (document.y + height > limit) {
    addPage(document);
    return true;
  }

  return false;
}

function horizontalRule(document: PdfDocument, y = document.y) {
  document
    .moveTo(page.left, y)
    .lineTo(document.page.width - page.right, y)
    .lineWidth(1)
    .strokeColor(colors.border)
    .stroke();
}

function addBrandHeader(
  document: PdfDocument,
  organization: OrganizationDocument,
  documentType: string,
) {
  const width = contentWidth(document);
  const badgeWidth = 112;
  const badgeX = document.page.width - page.right - badgeWidth;
  const leftWidth = width - badgeWidth - 24;
  let cursorY = page.top;

  document
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(colors.dark)
    .text(businessName(organization), page.left, page.top, {
      width: leftWidth,
    });
  cursorY +=
    document.heightOfString(businessName(organization), {
      width: leftWidth,
    }) + 5;

  if (organization.businessEmail) {
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(colors.muted)
      .text(organization.businessEmail, page.left, cursorY, {
        width: leftWidth,
      });
    cursorY +=
      document.heightOfString(organization.businessEmail, {
        width: leftWidth,
      }) + 4;
  }

  if (organization.businessAddress) {
    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor(colors.muted)
      .text(organization.businessAddress, page.left, cursorY, {
        lineGap: 2,
        width: leftWidth,
      });
    cursorY +=
      document.heightOfString(organization.businessAddress, {
        lineGap: 2,
        width: leftWidth,
      }) + 4;
  }

  document.roundedRect(badgeX, page.top, badgeWidth, 29, 8).fill(colors.accent);
  document
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(colors.white)
    .text(documentType.toUpperCase(), badgeX, page.top + 10, {
      align: 'center',
      characterSpacing: 0.8,
      width: badgeWidth,
    });

  document.y = Math.max(cursorY + 14, page.top + 62);
  horizontalRule(document);
  document.moveDown(1.4);
}

function addStatusBadge(
  document: PdfDocument,
  status: string,
  x: number,
  y: number,
) {
  const previousY = document.y;
  const label = statusLabel(status).toUpperCase();
  const badgeWidth = Math.max(66, document.widthOfString(label) + 24);
  const fill =
    status === 'paid' || status === 'final' ? colors.success : colors.accent;

  document.roundedRect(x, y, badgeWidth, 23, 7).fill(fill);
  document
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(colors.white)
    .text(label, x, y + 8, {
      align: 'center',
      characterSpacing: 0.6,
      width: badgeWidth,
    });

  document.y = previousY;
  return badgeWidth;
}

function addSectionTitle(document: PdfDocument, title: string) {
  ensureSpace(document, 42);
  document
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(colors.accent)
    .text(title.toUpperCase(), page.left, document.y, {
      characterSpacing: 0.8,
    });
  document.moveDown(0.65);
}

function addFooter(document: PdfDocument) {
  const range = document.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index += 1) {
    document.switchToPage(index);
    const footerY = document.page.height - 34;

    horizontalRule(document, footerY - 8);
    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor(colors.muted)
      .text('Generated by ClientFlow', page.left, footerY, {
        lineBreak: false,
      })
      .text(`Page ${index + 1} of ${range.count}`, page.left, footerY, {
        align: 'right',
        lineBreak: false,
        width: contentWidth(document),
      });
  }
}

function renderDocument(
  render: (document: PdfDocument) => void,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      bufferPages: true,
      info: {
        Creator: 'ClientFlow',
        Producer: 'ClientFlow',
      },
      margin: 0,
      size: 'A4',
    });
    const chunks: Buffer[] = [];

    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    render(document);
    addFooter(document);
    document.end();
  });
}

function addClientBlock(document: PdfDocument, client: ClientDocument) {
  const width = contentWidth(document);
  const detailLines = [
    client.name !== clientDisplayName(client) ? client.name : null,
    client.email,
    client.phone,
    client.address,
  ].filter((value): value is string => Boolean(value));
  const detailText = detailLines.join('\n');
  const detailHeight = document.heightOfString(detailText, {
    lineGap: 3,
    width: width - 32,
  });
  const boxHeight = Math.max(80, detailHeight + 43);

  ensureSpace(document, boxHeight + 8);
  const x = page.left;
  const y = document.y;
  document.roundedRect(x, y, width, boxHeight, 10).fill(colors.pale);
  document
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(colors.muted)
    .text('PREPARED FOR', x + 16, y + 15, {
      characterSpacing: 0.7,
    });
  document
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(colors.dark)
    .text(clientDisplayName(client), x + 16, y + 32, {
      width: width - 32,
    });
  document
    .font('Helvetica')
    .fontSize(9)
    .fillColor(colors.muted)
    .text(detailText, x + 16, y + 52, {
      lineGap: 3,
      width: width - 32,
    });
  document.y = y + boxHeight + 24;
}

function invoiceTableLayout(
  document: PdfDocument,
  invoice: InvoiceDocument,
): InvoiceTableLayout {
  const width = contentWidth(document);
  const gap = 12;
  const horizontalPadding = 12;
  const innerWidth = width - horizontalPadding * 2;

  document.font('Helvetica-Bold').fontSize(8);
  const hoursHeaderWidth = document.widthOfString('HOURS');
  const rateHeaderWidth = document.widthOfString('RATE');
  const amountHeaderWidth = document.widthOfString('AMOUNT');

  document.font('Helvetica').fontSize(9);
  const hoursContentWidth = Math.max(
    hoursHeaderWidth,
    ...invoice.items.map((item) =>
      document.widthOfString(item.quantity.toFixed(2)),
    ),
  );
  const rateContentWidth = Math.max(
    rateHeaderWidth,
    ...invoice.items.map((item) =>
      document.widthOfString(formatMoney(item.rate, invoice.currency)),
    ),
  );
  const amountContentWidth = Math.max(
    amountHeaderWidth,
    ...invoice.items.map((item) =>
      document.widthOfString(formatMoney(item.amount, invoice.currency)),
    ),
    document.widthOfString(formatMoney(invoice.total, invoice.currency)),
  );

  const hoursWidth = clamp(hoursContentWidth + 12, 48, 64);
  const rateWidth = clamp(rateContentWidth + 14, 82, 116);
  const amountWidth = clamp(amountContentWidth + 14, 92, 132);
  const descriptionWidth = Math.max(
    150,
    innerWidth - hoursWidth - rateWidth - amountWidth - gap * 3,
  );
  const descriptionX = page.left + horizontalPadding;
  const hoursX = descriptionX + descriptionWidth + gap;
  const rateX = hoursX + hoursWidth + gap;
  const amountX = rateX + rateWidth + gap;

  return {
    amountX,
    amountWidth,
    descriptionWidth,
    descriptionX,
    hoursX,
    hoursWidth,
    rateX,
    rateWidth,
    tableWidth: width,
  };
}

function addInvoiceTableHeader(
  document: PdfDocument,
  layout: InvoiceTableLayout,
) {
  const y = document.y;

  document.roundedRect(page.left, y, layout.tableWidth, 28, 7).fill(colors.dark);
  document
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(colors.white)
    .text('DESCRIPTION', layout.descriptionX, y + 10, {
      width: layout.descriptionWidth,
    })
    .text('HOURS', layout.hoursX, y + 10, {
      align: 'right',
      width: layout.hoursWidth,
    })
    .text('RATE', layout.rateX, y + 10, {
      align: 'right',
      width: layout.rateWidth,
    })
    .text('AMOUNT', layout.amountX, y + 10, {
      align: 'right',
      width: layout.amountWidth,
    });
  document.y = y + 34;
}

function addInvoiceItems(document: PdfDocument, invoice: InvoiceDocument) {
  const layout = invoiceTableLayout(document, invoice);

  addInvoiceTableHeader(document, layout);
  const width = contentWidth(document);

  invoice.items.forEach((item, index) => {
    document.font('Helvetica').fontSize(9);
    const descriptionHeight = document.heightOfString(item.description, {
      lineGap: 2,
      width: layout.descriptionWidth,
    });
    const rowHeight = Math.max(38, descriptionHeight + 18);

    if (ensureSpace(document, rowHeight + 4)) {
      addInvoiceTableHeader(document, layout);
    }

    const y = document.y;
    if (index % 2 === 1) {
      document.rect(page.left, y - 4, width, rowHeight).fill(colors.pale);
    }
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(colors.dark)
      .text(item.description, layout.descriptionX, y + 6, {
        lineGap: 2,
        width: layout.descriptionWidth,
      })
      .text(item.quantity.toFixed(2), layout.hoursX, y + 6, {
        align: 'right',
        width: layout.hoursWidth,
      })
      .text(formatMoney(item.rate, invoice.currency), layout.rateX, y + 6, {
        align: 'right',
        width: layout.rateWidth,
      })
      .font('Helvetica-Bold')
      .text(
        formatMoney(item.amount, invoice.currency),
        layout.amountX,
        y + 6,
        {
          align: 'right',
          width: layout.amountWidth,
        },
      );

    document.y = y + rowHeight;
    horizontalRule(document);
    document.y += 4;
  });
}

function addInvoiceTotals(document: PdfDocument, invoice: InvoiceDocument) {
  ensureSpace(document, 142);
  document.font('Helvetica-Bold').fontSize(13);
  const totalWidth = document.widthOfString(
    formatMoney(invoice.total, invoice.currency),
  );
  const width = clamp(totalWidth + 138, 250, contentWidth(document));
  const x = document.page.width - page.right - width;
  const rows = [
    ['Subtotal', formatMoney(invoice.subtotal, invoice.currency)],
    ['Discount', `- ${formatMoney(invoice.discount, invoice.currency)}`],
    [
      `Tax (${invoice.taxRate.toFixed(2)}%)`,
      formatMoney(invoice.taxAmount, invoice.currency),
    ],
  ];

  document.y += 10;
  for (const [label, value] of rows) {
    const y = document.y;
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(colors.muted)
      .text(label ?? '', x, y, { width: 105 })
      .font('Helvetica-Bold')
      .fillColor(colors.dark)
      .text(value ?? '', x + 110, y, {
        align: 'right',
        width: width - 110,
      });
    document.y = y + 22;
  }

  document.y += 3;
  const totalY = document.y;
  document.roundedRect(x, totalY, width, 42, 8).fill(colors.accentSoft);
  document
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(colors.dark)
    .text('TOTAL', x + 12, totalY + 15, { width: 75 })
    .fontSize(13)
    .fillColor(colors.accent)
    .text(formatMoney(invoice.total, invoice.currency), x + 90, totalY + 14, {
      align: 'right',
      width: width - 102,
    });
  document.y = totalY + 58;
}

function addMetricCards(
  document: PdfDocument,
  metrics: Array<{ label: string; value: string }>,
) {
  ensureSpace(document, 78);
  const gap = 10;
  const width =
    (contentWidth(document) - gap * (metrics.length - 1)) / metrics.length;
  const y = document.y;

  metrics.forEach((metric, index) => {
    const x = page.left + index * (width + gap);
    document.roundedRect(x, y, width, 66, 9).fill(colors.pale);
    document
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(colors.muted)
      .text(metric.label.toUpperCase(), x + 10, y + 13, {
        align: 'center',
        characterSpacing: 0.5,
        width: width - 20,
      })
      .fontSize(15)
      .fillColor(colors.dark)
      .text(metric.value, x + 10, y + 35, {
        align: 'center',
        width: width - 20,
      });
  });

  document.y = y + 82;
}

export function createInvoicePdf({
  client,
  invoice,
  organization,
}: {
  client: ClientDocument;
  invoice: InvoiceDocument;
  organization: OrganizationDocument;
}) {
  return renderDocument((document) => {
    addBrandHeader(document, organization, 'Invoice');
    const titleY = document.y;

    document
      .font('Helvetica-Bold')
      .fontSize(25)
      .fillColor(colors.dark)
      .text(invoice.invoiceNumber, page.left, titleY, {
        width: contentWidth(document) - 160,
      });
    addStatusBadge(
      document,
      invoice.status,
      document.page.width - page.right - 92,
      titleY + 2,
    );
    document.moveDown(0.5);
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(colors.muted)
      .text(
        `Issued ${formatDate(invoice.issueDate)}  |  Due ${formatDate(invoice.dueDate)}`,
        page.left,
        document.y,
      );
    document.moveDown(1.6);

    addClientBlock(document, client);
    addSectionTitle(document, 'Invoice items');
    addInvoiceItems(document, invoice);
    addInvoiceTotals(document, invoice);

    if (invoice.notes) {
      addSectionTitle(document, 'Notes');
      document
        .font('Helvetica')
        .fontSize(10)
        .fillColor(colors.dark)
        .text(invoice.notes, page.left, document.y, {
          lineGap: 4,
          width: contentWidth(document),
        });
      document.moveDown(1.4);
    }

    ensureSpace(document, 55);
    horizontalRule(document);
    document.moveDown(1);
    document
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(colors.dark)
      .text(
        invoice.status === 'paid'
          ? `Paid${invoice.paidAt ? ` on ${formatDate(invoice.paidAt)}` : ''}. Thank you.`
          : 'Thank you for your business.',
        page.left,
        document.y,
        { align: 'center', width: contentWidth(document) },
      );
  });
}

export function createWeeklyReportPdf({
  client,
  report,
  organization,
}: {
  client: ClientDocument;
  report: WeeklyReportDocument;
  organization: OrganizationDocument;
}) {
  return renderDocument((document) => {
    addBrandHeader(document, organization, 'Weekly report');
    const titleY = document.y;

    document
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor(colors.dark)
      .text(report.title, page.left, titleY, {
        width: contentWidth(document) - 135,
      });
    addStatusBadge(
      document,
      report.status,
      document.page.width - page.right - 78,
      titleY + 2,
    );
    document.moveDown(0.6);
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(colors.muted)
      .text(
        `${formatDate(report.weekStart)} - ${formatDate(report.weekEnd)}`,
        page.left,
        document.y,
      );
    document.moveDown(1.6);

    addClientBlock(document, client);
    addMetricCards(document, [
      { label: 'Total hours', value: `${report.totalHours.toFixed(2)}h` },
      { label: 'Billable', value: `${report.billableHours.toFixed(2)}h` },
      {
        label: 'Non-billable',
        value: `${report.nonBillableHours.toFixed(2)}h`,
      },
      { label: 'Work logs', value: String(report.workLogCount) },
    ]);

    addSectionTitle(document, 'Summary');
    document
      .font('Helvetica')
      .fontSize(10)
      .fillColor(colors.dark)
      .text(report.summary, page.left, document.y, {
        lineGap: 5,
        width: contentWidth(document),
      });
    document.moveDown(1.6);

    if (report.highlights.length > 0) {
      addSectionTitle(document, 'Highlights');

      for (const highlight of report.highlights) {
        document.font('Helvetica').fontSize(10);
        const height = document.heightOfString(highlight, {
          lineGap: 4,
          width: contentWidth(document) - 28,
        });
        ensureSpace(document, height + 16);
        const y = document.y;

        document.circle(page.left + 5, y + 6, 3).fill(colors.accent);
        document.fillColor(colors.dark).text(highlight, page.left + 20, y, {
          lineGap: 4,
          width: contentWidth(document) - 28,
        });
        document.moveDown(0.7);
      }
    }

    ensureSpace(document, 55);
    horizontalRule(document);
    document.moveDown(1);
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(colors.muted)
      .text(
        `Prepared by ${businessName(organization)} on ${formatDate(new Date())}.`,
        page.left,
        document.y,
        { align: 'center', width: contentWidth(document) },
      );
  });
}

export function pdfFilename(value: string) {
  const safeValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${safeValue || 'clientflow-document'}.pdf`;
}
