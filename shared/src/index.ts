export type ApiStatus = 'ok' | 'degraded';
export type DatabaseStatus = 'connected' | 'connecting' | 'disconnected';

export interface HealthResponse {
  status: ApiStatus;
  service: 'clientflow-api';
  version: string;
  timestamp: string;
  uptime: number;
  database: {
    status: DatabaseStatus;
    name: string | null;
  };
}

export type Currency = 'USD' | 'PKR' | 'GBP' | 'EUR';
export type UserRole = 'user' | 'admin';
export type WorkspaceType = 'solo' | 'company';
export type MembershipRole =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'finance'
  | 'member'
  | 'viewer';
export type MembershipStatus = 'active' | 'suspended';
export type Permission =
  | 'members.view'
  | 'members.viewProject'
  | 'members.manage'
  | 'members.invite'
  | 'clients.view'
  | 'clients.manage'
  | 'projects.view'
  | 'projects.manage'
  | 'projects.assign'
  | 'categories.manage'
  | 'worklogs.createOwn'
  | 'worklogs.viewOwn'
  | 'worklogs.editOwn'
  | 'worklogs.viewProject'
  | 'worklogs.viewAll'
  | 'worklogs.manageAll'
  | 'reports.view'
  | 'reports.manage'
  | 'invoices.view'
  | 'invoices.manage'
  | 'financials.view'
  | 'analytics.viewTeam'
  | 'settings.manage'
  | 'audit.view';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  workspaceType: WorkspaceType;
  role: MembershipRole;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  workspaceType: WorkspaceType;
  businessEmail: string | null;
  businessAddress: string | null;
  website: string | null;
  defaultCurrency: Currency;
  defaultHourlyRate: number | null;
  invoicePrefix: string;
  defaultInvoiceNotes: string | null;
  timezone: string;
  weekStartsOn: number;
  defaultWeeklyCapacity: number;
  workLogRequireCategory: boolean;
  workLogRequireDescription: boolean;
  workLogMinimumDescriptionLength: number;
  workLogLockAfterDays: number | null;
  invoiceTimeRoundingMinutes: 0 | 5 | 10 | 15 | 30;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
  jobTitle: string | null;
  status: MembershipStatus;
  reportingManagerId: string | null;
  weeklyCapacity: number;
  permissions: Permission[];
  permissionOverrides: {
    allow: Permission[];
    deny: Permission[];
  };
  joinedAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  businessName: string | null;
  businessAddress: string | null;
  avatarUrl: string | null;
  role: UserRole;
  defaultCurrency: Currency;
  defaultHourlyRate: number | null;
  invoicePrefix: string;
  defaultInvoiceNotes: string | null;
  forcePasswordChange: boolean;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
}

export interface SessionResponse {
  user: AuthUser;
  organization: Organization;
  membership: Membership;
  organizations: OrganizationSummary[];
}

export interface MessageResponse {
  message: string;
}

export type ClientStatus = 'active' | 'inactive' | 'archived';

export interface Client {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  status: ClientStatus;
  notes: string | null;
  activeProjects: number;
  unpaidAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientListResponse {
  clients: Client[];
  total: number;
  counts: Record<ClientStatus | 'all', number>;
}

export interface ClientResponse {
  client: Client;
  message?: string;
}

export interface ClientOverviewResponse {
  client: Client;
  metrics: {
    totalBilled: number;
    totalPaid: number;
    openInvoices: number;
    activeProjects: number;
    totalHours: number;
  };
}

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface ProjectClient {
  id: string;
  name: string;
  companyName: string | null;
}

export interface Project {
  id: string;
  clientId: string;
  client: ProjectClient;
  name: string;
  description: string | null;
  status: ProjectStatus;
  hourlyRate: number;
  currency: Currency;
  startDate: string | null;
  endDate: string | null;
  estimatedBudget: number | null;
  allowedCategoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
  counts: Record<ProjectStatus | 'all', number>;
}

export interface ProjectResponse {
  project: Project;
  message?: string;
}

export interface WorkLogClient {
  id: string;
  name: string;
  companyName: string | null;
}

export interface WorkLogProject {
  id: string;
  name: string;
  currency: Currency;
}

export type WorkLogBillingFilter = 'all' | 'billable' | 'non-billable';
export type WorkLogEntryMode = 'manual' | 'timer';
export type WorkLogStatus = 'completed' | 'running';

export interface WorkLog {
  id: string;
  clientId: string;
  projectId: string;
  invoiceId: string | null;
  client: WorkLogClient;
  project: WorkLogProject;
  title: string;
  description: string | null;
  category: string | null;
  categoryId: string | null;
  tags: string[];
  workDate: string;
  durationHours: number;
  billable: boolean;
  hourlyRate: number;
  currency: Currency;
  amount: number;
  entryMode: WorkLogEntryMode;
  status: WorkLogStatus;
  timerStartedAt: string | null;
  timerStoppedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLogListResponse {
  activeTimer: WorkLog | null;
  workLogs: WorkLog[];
  total: number;
  counts: Record<'all' | 'billable' | 'nonBillable', number>;
  summary: {
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    billableAmount: number;
  };
}

export interface WorkLogResponse {
  workLog: WorkLog;
  message?: string;
}

export type ExpenseBillableFilter = 'all' | 'billable' | 'non-billable';
export type ExpenseInvoiceFilter = 'all' | 'uninvoiced' | 'invoiced';

export interface Expense {
  id: string;
  clientId: string;
  projectId: string | null;
  invoiceId: string | null;
  client: ProjectClient;
  project: ProjectClient | null;
  description: string;
  category: string | null;
  expenseDate: string;
  amount: number;
  currency: Currency;
  billable: boolean;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  summary: {
    totalAmount: number;
    billableAmount: number;
    uninvoicedBillableAmount: number;
  };
}

export interface ExpenseResponse {
  expense: Expense;
  message?: string;
}

export interface WeeklyReportClient {
  id: string;
  name: string;
  companyName: string | null;
}

export type WeeklyReportStatus = 'draft' | 'final';

export interface WeeklyReport {
  id: string;
  clientId: string;
  client: WeeklyReportClient;
  title: string;
  weekStart: string;
  weekEnd: string;
  summary: string;
  highlights: string[];
  status: WeeklyReportStatus;
  workLogCount: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReportListResponse {
  reports: WeeklyReport[];
  total: number;
  counts: Record<WeeklyReportStatus | 'all', number>;
}

export interface WeeklyReportResponse {
  report: WeeklyReport;
  message?: string;
}

export type ScheduledReportFrequency = 'daily' | 'weekly' | 'monthly';

export interface ScheduledReport {
  id: string;
  clientId: string | null;
  client: WeeklyReportClient | null;
  name: string;
  frequency: ScheduledReportFrequency;
  recipients: string[];
  subject: string | null;
  active: boolean;
  nextRunAt: string;
  lastSentAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReportListResponse {
  scheduledReports: ScheduledReport[];
  total: number;
}

export interface ScheduledReportResponse {
  scheduledReport: ScheduledReport;
  message?: string;
}

export interface ScheduledReportRunResponse {
  message: string;
  processed: number;
  sent: number;
  failed: number;
}

export interface InvoiceClient {
  id: string;
  name: string;
  companyName: string | null;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  workLogId: string | null;
  expenseId: string | null;
}

export interface Invoice {
  id: string;
  clientId: string;
  client: InvoiceClient;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  status: InvoiceStatus;
  paidAt: string | null;
  linkedWorkLogCount: number;
  linkedExpenseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  counts: Record<InvoiceStatus | 'all', number>;
  summary: {
    totalBilled: number;
    totalPaid: number;
    outstandingAmount: number;
  };
}

export interface InvoiceResponse {
  invoice: Invoice;
  message?: string;
}
