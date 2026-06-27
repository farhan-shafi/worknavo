# ClientFlow

> ClientFlow is the current working title. The product will be renamed after a
> replacement domain is selected.

ClientFlow is a multi-tenant client operations platform for solo freelancers
and companies. It connects team access, project assignments, time tracking,
weekly reports, invoices, analytics, PDF exports, and email delivery.

For a step-by-step local setup guide, see [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md).

![ClientFlow dashboard](docs/screenshots/dashboard.png)

<p align="center">
  <img src="docs/screenshots/mobile-dashboard.png" alt="ClientFlow mobile navigation" width="320" />
</p>

## What the application does

A user can:

1. Create a solo or company workspace.
2. Belong to multiple organizations and switch securely between them.
3. Invite members as Admin, Project Manager, Finance, Member, or Viewer.
4. Assign people and approved categories to projects.
5. Track work manually or with one live timer per member.
6. Restrict members to their own data and managers to assigned projects.
7. Generate reports, invoices, PDFs, email deliveries, and CSV exports.
8. View role-specific analytics without leaking financial values.
9. Suspend access immediately and retain historical records.
10. Review real notifications and security-sensitive audit events.

## Main technology

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Frontend       | React 19, TypeScript, Vite          |
| Styling        | Tailwind CSS 4, Radix UI primitives |
| Routing        | React Router                        |
| Server state   | TanStack Query                      |
| Forms          | React Hook Form and Zod             |
| Charts         | Recharts                            |
| Backend        | Node.js, Express 5, TypeScript      |
| Database       | MongoDB and Mongoose                |
| Authentication | bcrypt, JWT, httpOnly cookies       |
| Documents      | PDFKit                              |
| Email          | Nodemailer over SMTP                |
| Tooling        | npm workspaces, ESLint, Prettier    |

## Architecture

```mermaid
flowchart LR
    Browser["React web application"] -->|"JSON + cookies"| API["Express API"]
    API --> Auth["Authentication middleware"]
    Auth --> Modules["Domain modules"]
    Modules --> Models["Mongoose models"]
    Models --> Atlas["MongoDB / Atlas"]
    Modules --> PDF["PDFKit generator"]
    Modules --> SMTP["Nodemailer / SMTP"]
    PDF --> Browser
    PDF --> SMTP
    SMTP --> Client["Client inbox"]
```

The repository is an npm-workspace monorepo:

```text
clientflow/
├── client/                       React application
│   └── src/
│       ├── app/                  Router and global providers
│       ├── components/
│       │   ├── layout/           Sidebar, topbar, responsive shell
│       │   ├── shared/           Tables, cards, loading/error states
│       │   └── ui/               Reusable UI primitives
│       ├── features/
│       │   ├── auth/
│       │   ├── clients/
│       │   ├── projects/
│       │   ├── work-logs/
│       │   ├── reports/
│       │   ├── invoices/
│       │   └── settings/
│       ├── lib/                  API client and shared browser utilities
│       ├── pages/                Landing page and dashboard
│       └── styles/
├── server/                       Express API
│   └── src/
│       ├── config/               Environment and database configuration
│       ├── middleware/           Auth, errors, rate limits, request IDs
│       ├── models/               Mongoose schemas
│       ├── modules/              Controllers, services, routes, validation
│       ├── routes/               Health endpoint
│       ├── scripts/              Demo data seeding
│       ├── types/                Express type augmentation
│       └── utils/                API errors and PDF generation
├── shared/                       Shared frontend/backend TypeScript contracts
├── docs/                         Deployment guide and screenshots
├── compose.yaml                  Optional local MongoDB
└── package.json                  Workspace scripts
```

## How the code is organized

Each business module follows a predictable path:

```text
Browser page
  → feature API function
  → Express route
  → authentication middleware
  → Zod validation
  → controller
  → domain service
  → Mongoose model
  → MongoDB
```

### Frontend

- `App.tsx` defines public and protected routes.
- `AppProviders` configures React Query, routing, tooltips, and toasts.
- `ProtectedRoute` calls `/api/auth/me` before rendering the application.
- Feature API files contain all HTTP calls for their module.
- Query files define stable TanStack Query keys and data fetching hooks.
- Forms use React Hook Form with client-side Zod validation.
- API validation errors are mapped back to their form fields.
- Mutations invalidate related query keys so dashboards and client profiles
  refresh automatically.
- Larger pages are lazy-loaded to reduce the initial JavaScript payload.

### Backend

- Express routes are grouped by domain.
- Protected routers require a verified access token.
- Controllers translate HTTP input/output and call services.
- Services contain ownership checks and business rules.
- Zod schemas validate and normalize route input.
- Mongoose models define persistence, constraints, and indexes.
- The centralized error handler converts expected failures into consistent JSON
  responses.
- Each request receives an `x-request-id` for debugging.

### Shared contracts

The `shared` workspace contains API response and domain interfaces used by both
the React and Express projects. This reduces accidental differences between
server responses and frontend expectations.

## Data model and relationships

```mermaid
erDiagram
    USER ||--o{ ORGANIZATION_MEMBERSHIP : joins
    ORGANIZATION ||--o{ ORGANIZATION_MEMBERSHIP : has
    ORGANIZATION ||--o{ CLIENT : owns
    ORGANIZATION ||--o{ PROJECT : owns
    ORGANIZATION ||--o{ WORK_LOG : owns
    ORGANIZATION ||--o{ WEEKLY_REPORT : owns
    ORGANIZATION ||--o{ INVOICE : owns
    ORGANIZATION ||--o{ WORK_CATEGORY : defines
    ORGANIZATION ||--o{ NOTIFICATION : emits
    ORGANIZATION ||--o{ AUDIT_EVENT : records
    ORGANIZATION_MEMBERSHIP ||--o{ PROJECT_ASSIGNMENT : receives
    ORGANIZATION_MEMBERSHIP ||--o{ WORK_LOG : creates
    PROJECT ||--o{ PROJECT_ASSIGNMENT : has
    CLIENT ||--o{ PROJECT : has
    CLIENT ||--o{ WORK_LOG : receives
    CLIENT ||--o{ WEEKLY_REPORT : receives
    CLIENT ||--o{ INVOICE : receives
    PROJECT ||--o{ WORK_LOG : contains
    INVOICE ||--o{ WORK_LOG : bills
```

Every business query includes the active `organizationId`. Authentication
reloads the active membership on each request, resolves role permissions plus
allow/deny overrides, and applies record scope before querying MongoDB.
Suspensions and role changes therefore take effect without waiting for a token
to expire.

Important rules include:

- A project must belong to a client in the active organization.
- Members can select only assigned projects and allowed categories.
- Project Managers are restricted to assigned project data.
- Financial values require `financials.view`.
- A work log must belong to the selected client and project.
- Only completed billable work logs can be added to an invoice.
- A work log cannot belong to multiple invoices.
- Running timers cannot be invoiced.
- Project deletion is blocked while work logs still reference it.
- Client deletion is blocked while dependent records remain.
- Invoice totals are calculated on the server.

## Authentication and session lifecycle

1. Registration hashes the password with bcrypt.
2. Login verifies the password and creates access and refresh JWTs.
3. Both tokens are stored in `httpOnly`, same-site cookies.
4. The access token expires after 15 minutes.
5. The refresh token renews the session through `/api/auth/refresh`.
6. “Keep me signed in” uses a longer refresh-token lifetime.
7. Logout clears both cookies.

Tokens are not stored in `localStorage`, so browser JavaScript cannot directly
read them.

Authentication and password-reset endpoints are rate-limited. Production mode
also requires non-development JWT secrets.

## Work timer

The timer creates a running work-log record containing `timerStartedAt`. The UI
shows live elapsed time without continuously writing to MongoDB. When the user
stops the timer, the API calculates the duration, stores the rounded hours, and
marks the work log completed.

Only one running timer is allowed per organization membership. The same user
may therefore have independent work in different organizations.

## Reports

Weekly reports store:

- Client and week range
- Summary and highlights
- Work-log count
- Total, billable, and non-billable hours
- Draft or final status

When summary text is omitted, the server generates a practical summary from
work logs inside the selected range.

## Invoices

Invoice items represent hours multiplied by an hourly rate:

```text
line amount = hours × rate
subtotal = sum of line amounts
taxable amount = subtotal - discount
tax = taxable amount × tax rate
total = taxable amount + tax
```

The database field remains named `quantity` for compatibility, but the product
labels it as **Hours** because ClientFlow invoices time-based service work.

New invoice numbers use the organization's prefix, for example `NS-0001`.

## PDF generation

The API generates PDFs in memory with PDFKit. It does not save permanent files
to the server filesystem.

PDFs include:

- Business name, email, and address
- Client contact details
- Report or invoice metadata
- Hour, rate, amount, and total breakdowns
- Notes, summaries, highlights, and statuses
- Page numbers and ClientFlow footer

Routes:

```text
GET /api/reports/:id/pdf
GET /api/invoices/:id/pdf
```

## Email delivery

Report and invoice email buttons:

1. Load the owned document and client.
2. Generate the PDF in memory.
3. Build an HTML and plain-text email.
4. Send it through Resend direct API when configured, otherwise through SMTP.
5. Attach the generated PDF.
6. Record success or failure in the `emaillogs` collection.

Routes:

```text
POST /api/reports/:id/send-email
POST /api/invoices/:id/send-email
```

Email provider secrets are read only from `server/.env`; they are never stored
in MongoDB.

## Environment variables

Create `server/.env`:

```env
PORT=5050
NODE_ENV=development
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/clientflow?retryWrites=true&w=majority
JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters
JWT_REFRESH_SECRET=replace-with-a-different-32-character-secret
CLIENT_URL=http://localhost:5173

RESEND_API_KEY=re_your_resend_api_key
SMTP_FROM=onboarding@resend.dev
SMTP_FROM_NAME=Your Business Name

# Optional SMTP fallback. Not needed when RESEND_API_KEY is set.
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
```

Create `client/.env`:

```env
VITE_API_URL=/api
```

### Email setup with Resend

1. Create a Resend API key.
2. Put the key in `RESEND_API_KEY`.
3. For testing, use `SMTP_FROM=onboarding@resend.dev`.
4. For public usage, verify your domain in Resend and use an address like
   `SMTP_FROM=noreply@yourdomain.com`.
5. Restart or redeploy the API after changing environment values.

`SMTP_FROM_NAME` is the sender name shown in the recipient's inbox.

## Local development

Requirements:

- Node.js 20.19 or newer
- npm 10 or newer
- MongoDB Atlas, local MongoDB, or Docker

Install:

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
```

For MongoDB Atlas:

1. Create a database user.
2. Add the current IP address in Atlas Network Access.
3. Copy the Node.js connection string into `MONGO_URI`.
4. URL-encode special characters in the database password.

Alternatively, start local MongoDB:

```bash
docker compose up -d mongodb
```

Run the application:

```bash
npm run dev
```

Open:

- Web app: <http://localhost:5173>
- API: <http://localhost:5050/api>
- Health check: <http://localhost:5050/api/health>

## Migrating existing freelancer data

Back up the Atlas database, then run:

```bash
npm run migrate:organizations
```

For each existing user the migration creates one solo organization and Owner
membership, copies business/invoice defaults, and adds organization and creator
references to clients, projects, work logs, reports, invoices, and email logs.
It preserves record IDs, invoice numbers, totals, and PDF URLs.

The migration is idempotent. Every run writes a JSON report containing the
user, organization, membership, and before/after record counts. Set
`MIGRATION_REPORT_PATH=/absolute/path/report.json` to control its location.
Keep this file with the database backup as the rollback map.

## Demo workspace

Create or reset the isolated demo account:

```bash
npm run seed:demo
```

Login:

```text
Email: demo@clientflow.local
Password: DemoPass123
```

The seed script only replaces records belonging to the dedicated demo account.
It does not delete other users' data.

## Commands

| Command                         | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                   | Start the frontend and API                                              |
| `npm run dev:client`            | Start Vite only                                                         |
| `npm run dev:server`            | Start Express only                                                      |
| `npm run seed:demo`             | Reset and seed the demo workspace                                       |
| `npm run migrate:organizations` | Idempotently migrate legacy freelancer data and write a rollback report |
| `npm run lint`                  | Run ESLint                                                              |
| `npm run typecheck`             | Type-check all workspaces                                               |
| `npm run build`                 | Build all workspaces                                                    |
| `npm run format`                | Format source files                                                     |

## API overview

All routes except health and authentication entry points require a valid
session.

| Area           | Routes                                                                               |
| -------------- | ------------------------------------------------------------------------------------ |
| Health         | `GET /api/health`                                                                    |
| Authentication | `/api/auth/register`, `/login`, `/logout`, `/refresh`, `/me`, `/switch-organization` |
| Organizations  | List, create, read, and update active workspaces under `/api/organizations`          |
| Team           | Members, invitations, suspension, roles, ownership transfer, and assignments         |
| Categories     | Organization category library under `/api/categories`                                |
| Clients        | CRUD under `/api/clients` plus overview and client projects                          |
| Projects       | CRUD under `/api/projects`                                                           |
| Work logs      | CRUD under `/api/work-logs`, plus `/timer/start` and `/timer/stop`                   |
| Reports        | CRUD under `/api/reports`, plus PDF and email routes                                 |
| Invoices       | CRUD under `/api/invoices`, generation, PDF, email, and mark-paid routes             |
| Analytics      | Personal/team/project analytics and `/api/analytics/export.csv`                      |
| Notifications  | List, unread state, mark-read, and mark-all-read                                     |
| Audit trail    | Scoped immutable event listing under `/api/audit-events`                             |

## Dashboard behavior

The dashboard uses real client, project, and work-log queries. It derives:

- Client and project totals
- Current-month hours
- Billable entry count
- Six-week billable/non-billable trend
- Billable hour split
- Top clients by tracked hours
- Recent work activity

The setup checklist only appears while onboarding is incomplete. It disappears
automatically after the user has a client, project, and work log.

## Notifications and audit trail

The bell reads persisted notification records; it does not fabricate demo
messages. Initial events cover role changes, assignments, invitations,
suspension/reactivation, reminders, budget warnings, and delivery failures.
Mutations such as role changes, category changes, project assignments, invite
revocation, and ownership transfer also create organization-scoped audit
events containing safe metadata only.

## Error, loading, and empty states

- Protected route loading uses the dashboard shell skeleton.
- List pages show module-specific skeletons.
- Empty states explain the next useful action.
- Filtered empty states suggest clearing or changing filters.
- Query failures show a consistent retry component.
- Mutations use success and error toasts.
- Validation errors are shown beside the relevant fields.

## Free-service limits

Limits change over time. These were checked on June 25, 2026.

### MongoDB Atlas Free cluster

The application currently uses MongoDB Atlas.

- 0.5 GB total data and index storage
- 100 read/write operations per second
- 500 simultaneous connections
- 10 GB inbound and 10 GB outbound transfer per rolling seven days
- One Free cluster per Atlas project
- No built-in backups or private endpoints
- Automatically pauses after 30 days with no connections

For a portfolio or low-traffic demo this is sufficient. It is not a production
backup or high-availability plan.

Official reference:
<https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/>

### Gmail SMTP

The application can use a personal Gmail account for SMTP testing.

- Personal Gmail may stop sending after more than 500 emails in one day or
  more than 500 recipients in a message.
- Sending can remain blocked for 1–24 hours after reaching the limit.
- High bounce rates can temporarily block sending.
- Gmail is suitable for testing and small personal usage, not bulk or
  transactional SaaS email.

Official reference: <https://support.google.com/mail/answer/22839>

For a hosted product, use a transactional provider such as Postmark, Resend,
Mailgun, or Amazon SES.

### Cloudinary

Cloudinary is **not currently used** by this codebase. There is no image-upload
feature and no Cloudinary environment variable is required.

If logo upload is added later, Cloudinary's current Free plan lists:

- 25 monthly credits
- Three users on one account
- Upload, transformation, search, and CDN delivery features

Credits are shared by storage, transformations, and delivery, so the exact
number of assets depends on usage.

Official reference: <https://cloudinary.com/pricing>

### Optional Vercel frontend hosting

The frontend has not been deployed yet. Vercel Hobby currently includes, among
other limits, 100 GB fast data transfer, one million function invocations, and
100 deployments per day. This React build is primarily static, so it normally
uses far fewer resources.

Official reference: <https://vercel.com/docs/limits>

### Optional Render API hosting

The API has not been deployed yet. Render Free web services:

- Spin down after 15 minutes without inbound traffic
- Can take about one minute to wake up
- Receive 750 free instance hours per workspace each month
- Use an ephemeral filesystem, so local uploaded files are lost

MongoDB Atlas remains persistent because it is external to Render.

Official reference: <https://render.com/docs/free>

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for frontend, API, database, SMTP,
and production environment instructions.

## Security notes

- Never commit `.env` files.
- Never expose MongoDB or SMTP credentials in frontend variables.
- Use separate random access and refresh secrets.
- Restrict MongoDB Atlas Network Access for production.
- Use HTTPS in production.
- Use a dedicated transactional email provider for public usage.
- Add automated backups before treating the application as production data.

## Current limitations

- Forgot-password requests are privacy-safe but reset-token delivery is not yet
  implemented.
- Business logo upload is not implemented.
- There are no recurring invoices or automated overdue reminders.
- There is no payment gateway.
- Automated integration tests are a future improvement.
- Attendance, leave, payroll, payment gateways, timesheet approval, recurring
  invoices, and saved analytics presets are outside the first team release.

## Quality checks

Before release:

```bash
npm run lint
npm run typecheck
npm run build
```

The final Phase 12 implementation passes all three checks.

## Author

Built by Farhan Shafi as a full-stack SaaS portfolio project.
