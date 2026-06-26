import type {
  MessageResponse,
  WeeklyReportListResponse,
  WeeklyReportResponse,
} from '@clientflow/shared';
import type { Request, Response } from 'express';

import { toWeeklyReportContract } from '../../models/WeeklyReport.model.js';
import { ApiError } from '../../utils/api-error.js';
import { workspaceActor } from '../../auth/workspace-context.js';
import {
  createWeeklyReportPdf,
  pdfFilename,
} from '../../utils/pdf-generator.js';
import { sendDocumentEmail } from '../email/email.service.js';
import { weeklyReportEmailTemplate } from '../email/email.templates.js';
import {
  createWeeklyReport as createWeeklyReportService,
  deleteWeeklyReport as deleteWeeklyReportService,
  getWeeklyReport,
  listWeeklyReports as listWeeklyReportsService,
  updateWeeklyReport as updateWeeklyReportService,
} from './report.service.js';
import {
  createWeeklyReportSchema,
  listWeeklyReportsQuerySchema,
  updateWeeklyReportSchema,
} from './report.validation.js';

function reportId(request: Request) {
  const id = request.params.id;

  if (typeof id !== 'string') {
    throw new ApiError(404, 'Report not found.');
  }

  return id;
}

export async function listWeeklyReports(request: Request, response: Response) {
  const filters = listWeeklyReportsQuerySchema.parse(request.query);
  const body: WeeklyReportListResponse = await listWeeklyReportsService(
    workspaceActor(request),
    filters,
  );
  response.status(200).json(body);
}

export async function createWeeklyReport(request: Request, response: Response) {
  const input = createWeeklyReportSchema.parse(request.body);
  const report = await createWeeklyReportService(
    workspaceActor(request),
    input,
  );
  const body: WeeklyReportResponse = {
    message: 'Weekly report created successfully.',
    report,
  };
  response.status(201).json(body);
}

export async function showWeeklyReport(request: Request, response: Response) {
  const { report, client } = await getWeeklyReport(
    workspaceActor(request),
    reportId(request),
  );
  const body: WeeklyReportResponse = {
    report: toWeeklyReportContract(report, {
      id: client._id.toString(),
      name: client.name,
      companyName: client.companyName ?? null,
    }),
  };
  response.status(200).json(body);
}

export async function downloadWeeklyReport(
  request: Request,
  response: Response,
) {
  const actor = workspaceActor(request);
  const { report, client } = await getWeeklyReport(actor, reportId(request));
  const pdf = await createWeeklyReportPdf({
    client,
    report,
    organization: actor.organization,
  });
  const filename = pdfFilename(
    `${report.title}-${report.weekStart.toISOString().slice(0, 10)}`,
  );

  response
    .status(200)
    .set({
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdf.length),
      'Content-Type': 'application/pdf',
    })
    .send(pdf);
}

export async function emailWeeklyReport(request: Request, response: Response) {
  const actor = workspaceActor(request);
  const user = actor.user;
  const { report, client } = await getWeeklyReport(actor, reportId(request));
  const pdf = await createWeeklyReportPdf({
    client,
    report,
    organization: actor.organization,
  });
  const template = weeklyReportEmailTemplate({
    client,
    report,
    organization: actor.organization,
  });

  await sendDocumentEmail({
    user,
    organization: actor.organization,
    membership: actor.membership,
    client,
    documentId: report._id.toString(),
    documentType: 'report',
    ...template,
    filename: pdfFilename(
      `${report.title}-${report.weekStart.toISOString().slice(0, 10)}`,
    ),
    pdf,
  });

  const body: MessageResponse = {
    message: `Report emailed to ${client.email}.`,
  };
  response.status(200).json(body);
}

export async function updateWeeklyReport(request: Request, response: Response) {
  const input = updateWeeklyReportSchema.parse(request.body);

  if (Object.keys(input).length === 0) {
    throw new ApiError(422, 'Provide at least one report field to update.');
  }

  const report = await updateWeeklyReportService(
    workspaceActor(request),
    reportId(request),
    input,
  );
  const body: WeeklyReportResponse = {
    message: 'Weekly report updated successfully.',
    report,
  };
  response.status(200).json(body);
}

export async function deleteWeeklyReport(request: Request, response: Response) {
  await deleteWeeklyReportService(workspaceActor(request), reportId(request));
  const body: MessageResponse = {
    message: 'Weekly report deleted successfully.',
  };
  response.status(200).json(body);
}
