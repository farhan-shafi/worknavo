import { writeFile } from 'node:fs/promises';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { ClientModel } from '../models/Client.model.js';
import { EmailLogModel } from '../models/EmailLog.model.js';
import { InvoiceModel } from '../models/Invoice.model.js';
import { OrganizationMembershipModel } from '../models/OrganizationMembership.model.js';
import { OrganizationModel } from '../models/Organization.model.js';
import { ProjectModel } from '../models/Project.model.js';
import { UserModel } from '../models/User.model.js';
import { WeeklyReportModel } from '../models/WeeklyReport.model.js';
import { WorkLogModel } from '../models/WorkLog.model.js';
import { ensureUserWorkspace } from '../modules/organizations/organization.service.js';

const collections = {
  clients: ClientModel,
  projects: ProjectModel,
  workLogs: WorkLogModel,
  reports: WeeklyReportModel,
  invoices: InvoiceModel,
  emailLogs: EmailLogModel,
};

async function countsForUser(userId: string) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(collections).map(async ([name, model]) => [
        name,
        await model.countDocuments({ userId }),
      ]),
    ),
  );
}

async function migrate() {
  await connectDatabase();
  const users = await UserModel.find({}).sort({ createdAt: 1 });
  const report = {
    startedAt: new Date().toISOString(),
    users: [] as Array<Record<string, unknown>>,
    totals: {
      users: users.length,
      organizationsBefore: await OrganizationModel.countDocuments(),
      membershipsBefore: await OrganizationMembershipModel.countDocuments(),
      organizationsAfter: 0,
      membershipsAfter: 0,
    },
  };

  for (const user of users) {
    const before = await countsForUser(user._id.toString());
    const { organization, membership } = await ensureUserWorkspace(user);
    const after = await countsForUser(user._id.toString());
    report.users.push({
      userId: user._id.toString(),
      email: user.email,
      organizationId: organization._id.toString(),
      membershipId: membership._id.toString(),
      before,
      after,
      unchanged: JSON.stringify(before) === JSON.stringify(after),
    });
  }

  report.totals.organizationsAfter = await OrganizationModel.countDocuments();
  report.totals.membershipsAfter =
    await OrganizationMembershipModel.countDocuments();
  for (const [model, indexName] of [
    [ClientModel, 'userId_1_email_1'],
    [InvoiceModel, 'userId_1_invoiceNumber_1'],
  ] as const) {
    try {
      await model.collection.dropIndex(indexName);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.toLowerCase().includes('index not found')
      ) {
        console.warn(`Could not remove legacy index ${indexName}:`, error);
      }
    }
  }
  const finishedReport = {
    ...report,
    finishedAt: new Date().toISOString(),
  };
  const outputPath =
    process.env.MIGRATION_REPORT_PATH ??
    `organization-migration-${new Date().toISOString().replaceAll(':', '-')}.json`;
  await writeFile(outputPath, JSON.stringify(finishedReport, null, 2), 'utf8');
  console.info(JSON.stringify({ outputPath, totals: report.totals }, null, 2));
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
