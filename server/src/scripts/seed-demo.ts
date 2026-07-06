import bcrypt from 'bcryptjs';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { ClientModel } from '../models/Client.model.js';
import { EmailLogModel } from '../models/EmailLog.model.js';
import { InvoiceModel } from '../models/Invoice.model.js';
import { ProjectModel } from '../models/Project.model.js';
import { UserModel } from '../models/User.model.js';
import { WeeklyReportModel } from '../models/WeeklyReport.model.js';
import { WorkLogModel } from '../models/WorkLog.model.js';
import { ensureUserWorkspace } from '../modules/organizations/organization.service.js';
import { OrganizationMembershipModel } from '../models/OrganizationMembership.model.js';
import { ProjectAssignmentModel } from '../models/ProjectAssignment.model.js';
import { WorkCategoryModel } from '../models/WorkCategory.model.js';

const DEMO_EMAIL = 'demo@worknavo.local';
const DEMO_PASSWORD = 'DemoPass123';

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function clearDemoWorkspace(userId: string) {
  await Promise.all([
    ClientModel.deleteMany({ userId }),
    EmailLogModel.deleteMany({ userId }),
    InvoiceModel.deleteMany({ userId }),
    ProjectModel.deleteMany({ userId }),
    WeeklyReportModel.deleteMany({ userId }),
    WorkLogModel.deleteMany({ userId }),
  ]);
}

async function seedDemo() {
  await connectDatabase();

  let user = await UserModel.findOne({ email: DEMO_EMAIL });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  if (user) {
    await clearDemoWorkspace(user._id.toString());
    user.name = 'Alex Morgan';
    user.passwordHash = passwordHash;
    user.businessName = 'Northstar Studio';
    user.businessAddress = '88 Market Street\nSan Francisco, CA 94105';
    user.defaultCurrency = 'USD';
    user.defaultHourlyRate = 125;
    user.invoicePrefix = 'NS';
    user.defaultInvoiceNotes =
      'Payment is due within 14 days. Thank you for your business.';
    await user.save();
  } else {
    user = await UserModel.create({
      name: 'Alex Morgan',
      email: DEMO_EMAIL,
      passwordHash,
      businessName: 'Northstar Studio',
      businessAddress: '88 Market Street\nSan Francisco, CA 94105',
      defaultCurrency: 'USD',
      defaultHourlyRate: 125,
      invoicePrefix: 'NS',
      defaultInvoiceNotes:
        'Payment is due within 14 days. Thank you for your business.',
    });
  }

  const clients = await ClientModel.create([
    {
      userId: user._id,
      name: 'Maya Chen',
      companyName: 'Acme Labs',
      email: 'maya@acmelabs.example',
      phone: '+1 415 555 0138',
      website: 'acmelabs.example',
      address: '120 Mission Street, San Francisco, CA',
      status: 'active',
      notes: 'Weekly updates every Friday. Maya prefers concise summaries.',
    },
    {
      userId: user._id,
      name: 'Noah Williams',
      companyName: 'Harbor & Pine',
      email: 'noah@harborpine.example',
      phone: '+1 206 555 0184',
      website: 'harborpine.example',
      address: '44 Elliott Avenue, Seattle, WA',
      status: 'active',
      notes: 'Brand refresh engagement with a flexible delivery schedule.',
    },
  ]);
  const acme = clients[0]!;
  const harbor = clients[1]!;

  const projects = await ProjectModel.create([
    {
      userId: user._id,
      clientId: acme._id,
      name: 'Customer portal redesign',
      description:
        'Research, redesign, and frontend delivery for Acme’s customer portal.',
      status: 'active',
      hourlyRate: 125,
      currency: 'USD',
      startDate: daysAgo(32),
      estimatedBudget: 18_000,
    },
    {
      userId: user._id,
      clientId: harbor._id,
      name: 'Brand launch toolkit',
      description:
        'Launch assets, campaign landing page, and final brand documentation.',
      status: 'active',
      hourlyRate: 110,
      currency: 'USD',
      startDate: daysAgo(20),
      estimatedBudget: 12_500,
    },
  ]);
  const portal = projects[0]!;
  const brand = projects[1]!;

  const logs = await WorkLogModel.create([
    {
      userId: user._id,
      clientId: acme._id,
      projectId: portal._id,
      title: 'Portal dashboard UX',
      description: 'Refined dashboard hierarchy and responsive states.',
      category: 'Design',
      tags: ['portal', 'ux'],
      workDate: daysAgo(12),
      durationHours: 4.5,
      billable: true,
      hourlyRate: 125,
      currency: 'USD',
      entryMode: 'manual',
      status: 'completed',
    },
    {
      userId: user._id,
      clientId: acme._id,
      projectId: portal._id,
      title: 'Component implementation',
      description: 'Built reusable navigation and account components.',
      category: 'Development',
      tags: ['react', 'frontend'],
      workDate: daysAgo(10),
      durationHours: 6,
      billable: true,
      hourlyRate: 125,
      currency: 'USD',
      entryMode: 'manual',
      status: 'completed',
    },
    {
      userId: user._id,
      clientId: acme._id,
      projectId: portal._id,
      title: 'Stakeholder review',
      description: 'Presented progress and documented next-step decisions.',
      category: 'Meetings',
      tags: ['review'],
      workDate: daysAgo(8),
      durationHours: 1.5,
      billable: false,
      hourlyRate: 125,
      currency: 'USD',
      entryMode: 'manual',
      status: 'completed',
    },
    {
      userId: user._id,
      clientId: harbor._id,
      projectId: brand._id,
      title: 'Launch page design',
      description: 'Designed responsive campaign page concepts.',
      category: 'Design',
      tags: ['launch', 'web'],
      workDate: daysAgo(5),
      durationHours: 5,
      billable: true,
      hourlyRate: 110,
      currency: 'USD',
      entryMode: 'manual',
      status: 'completed',
    },
    {
      userId: user._id,
      clientId: harbor._id,
      projectId: brand._id,
      title: 'Campaign asset production',
      description: 'Prepared social, email, and presentation launch assets.',
      category: 'Design',
      tags: ['campaign', 'assets'],
      workDate: daysAgo(3),
      durationHours: 4,
      billable: true,
      hourlyRate: 110,
      currency: 'USD',
      entryMode: 'manual',
      status: 'completed',
    },
    {
      userId: user._id,
      clientId: harbor._id,
      projectId: brand._id,
      title: 'Launch checklist and QA',
      description: 'Reviewed assets and prepared the final handoff checklist.',
      category: 'QA',
      tags: ['qa', 'handoff'],
      workDate: daysAgo(1),
      durationHours: 2.5,
      billable: true,
      hourlyRate: 110,
      currency: 'USD',
      entryMode: 'manual',
      status: 'completed',
    },
  ]);

  const invoiceItems = logs.slice(0, 2).map((log) => ({
    description: log.title,
    quantity: log.durationHours,
    rate: log.hourlyRate,
    amount: Number((log.durationHours * log.hourlyRate).toFixed(2)),
    workLogId: log._id,
  }));
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const invoice = await InvoiceModel.create({
    userId: user._id,
    clientId: acme._id,
    invoiceNumber: 'NS-0001',
    issueDate: daysAgo(7),
    dueDate: daysFromNow(7),
    currency: 'USD',
    items: invoiceItems,
    subtotal,
    discount: 0,
    taxRate: 0,
    taxAmount: 0,
    total: subtotal,
    notes: user.defaultInvoiceNotes,
    status: 'sent',
  });
  await WorkLogModel.updateMany(
    { _id: { $in: logs.slice(0, 2).map((log) => log._id) } },
    { $set: { invoiceId: invoice._id } },
  );

  await WeeklyReportModel.create({
    userId: user._id,
    clientId: acme._id,
    title: 'Customer portal weekly update',
    weekStart: daysAgo(14),
    weekEnd: daysAgo(8),
    summary:
      'The portal redesign moved from UX refinement into reusable frontend implementation. The dashboard hierarchy is approved and the account navigation is ready for the next integration pass.',
    highlights: [
      'Completed responsive dashboard UX',
      'Built reusable navigation components',
      'Documented stakeholder feedback and next steps',
    ],
    status: 'final',
    workLogCount: 3,
    totalHours: 12,
    billableHours: 10.5,
    nonBillableHours: 1.5,
  });

  const { organization, membership: ownerMembership } =
    await ensureUserWorkspace(user);
  organization.workspaceType = 'company';
  await organization.save();
  await Promise.all([
    OrganizationMembershipModel.deleteMany({
      organizationId: organization._id,
      _id: { $ne: ownerMembership._id },
    }),
    ProjectAssignmentModel.deleteMany({ organizationId: organization._id }),
    WorkCategoryModel.deleteMany({ organizationId: organization._id }),
  ]);
  const demoPeople = [
    {
      name: 'Priya Shah',
      email: 'manager@worknavo.local',
      role: 'project_manager' as const,
      title: 'Delivery Lead',
    },
    {
      name: 'Sam Rivera',
      email: 'finance@worknavo.local',
      role: 'finance' as const,
      title: 'Finance Manager',
    },
    {
      name: 'Jordan Lee',
      email: 'member@worknavo.local',
      role: 'member' as const,
      title: 'Product Designer',
    },
  ];
  const seededMemberships = [];
  for (const person of demoPeople) {
    const memberUser = await UserModel.findOneAndUpdate(
      { email: person.email },
      {
        $set: {
          name: person.name,
          passwordHash,
          forcePasswordChange: false,
          lastActiveOrganizationId: organization._id,
        },
      },
      { new: true, upsert: true, runValidators: true },
    );
    seededMemberships.push(
      await OrganizationMembershipModel.create({
        organizationId: organization._id,
        userId: memberUser._id,
        role: person.role,
        jobTitle: person.title,
        status: 'active',
        weeklyCapacity: 40,
        permissionOverrides: { allow: [], deny: [] },
        joinedAt: new Date(),
      }),
    );
  }
  const categories = await WorkCategoryModel.create([
    {
      organizationId: organization._id,
      name: 'Design',
      color: '#E35D22',
      defaultBillable: true,
    },
    {
      organizationId: organization._id,
      name: 'Development',
      color: '#2563EB',
      defaultBillable: true,
    },
    {
      organizationId: organization._id,
      name: 'Meetings',
      color: '#7C3AED',
      defaultBillable: false,
    },
  ]);
  await ProjectAssignmentModel.create([
    {
      organizationId: organization._id,
      projectId: portal._id,
      membershipId: seededMemberships[0]!._id,
      assignmentType: 'project_manager',
      categoryIds: categories.map((category) => category._id),
      active: true,
    },
    {
      organizationId: organization._id,
      projectId: portal._id,
      membershipId: seededMemberships[2]!._id,
      assignmentType: 'contributor',
      categoryIds: categories.slice(0, 2).map((category) => category._id),
      active: true,
    },
  ]);

  console.info('WorkNavo demo workspace is ready.');
  console.info(`Email: ${DEMO_EMAIL}`);
  console.info(`Password: ${DEMO_PASSWORD}`);
  console.info(
    'Additional users: manager@worknavo.local, finance@worknavo.local, member@worknavo.local',
  );
}

seedDemo()
  .catch((error) => {
    console.error('Demo seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
