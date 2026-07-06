import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  CircleDollarSign,
  Clock3,
  Compass,
  FileText,
  Layers3,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { cn } from '../lib/utils';

const platformFeatures: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Timer,
    title: 'Timer and manual logs',
    description:
      'Track live work, add manual entries, and keep one clean timeline per member.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Projects, clients, categories',
    description:
      'Connect every hour to a client, project, category, rate, and billing context.',
  },
  {
    icon: UsersRound,
    title: 'Team roles that scale',
    description:
      'Support owners, admins, project managers, finance users, members, and viewers.',
  },
  {
    icon: FileText,
    title: 'Reports and invoices',
    description:
      'Turn billable work into client summaries, PDFs, emails, and invoices.',
  },
  {
    icon: BarChart3,
    title: 'Analytics and CSV export',
    description:
      'Review member utilization, project hours, billable time, and export team data.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit and notifications',
    description:
      'Track important workspace changes and show real alerts instead of fake noise.',
  },
];

const roleRows = [
  ['Owner/Admin', 'Full workspace control', 'Team, settings, billing, audit'],
  ['Project Manager', 'Managed projects only', 'Project team, logs, reports'],
  ['Finance', 'Billing workspace', 'Invoices, billable time, revenue'],
  ['Member', 'Personal workspace', 'Own timer, logs, assigned projects'],
];

const useCases = [
  'Freelancers growing into teams',
  'Design and dev agencies',
  'Consultants billing by the hour',
  'Finance teams preparing invoices',
];

const sampleActivity = [
  ['Project kickoff', 'BrightPixel Studio', '2.0h'],
  ['Landing page build', 'NovaTech AI', '3.75h'],
  ['Invoice review', 'Northstar Studio', '1.25h'],
];

const dashboardStats: Array<{
  label: string;
  value: string;
  icon: LucideIcon;
}> = [
  { label: 'Team hours', value: '146.5', icon: Clock3 },
  { label: 'Managed projects', value: '18', icon: Layers3 },
  { label: 'Unbilled value', value: '$18.4k', icon: CircleDollarSign },
  { label: 'Utilization', value: '82%', icon: BarChart3 },
];

export function Brand() {
  return (
    <Link className="inline-flex items-center gap-2.5" to="/">
      <span className="bg-foreground shadow-foreground/15 grid size-10 place-items-center rounded-xl text-white shadow-lg">
        <Compass className="size-5" />
      </span>
      <span className="text-lg font-extrabold tracking-[-0.035em]">
        Work<span className="text-primary">Navo</span>
      </span>
    </Link>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto mt-14 max-w-6xl">
      <Card className="relative overflow-hidden border-white/80 bg-white/95 p-2 shadow-[0_40px_100px_-45px_rgba(31,41,55,0.45)]">
        <div className="border-border/80 bg-background grid min-h-[590px] overflow-hidden rounded-2xl border lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-border hidden border-r bg-white p-5 lg:block">
            <Brand />
            <div className="mt-9 space-y-2">
              {[
                'Overview',
                'Project Teams',
                'My Work',
                'Reports',
                'Invoices',
              ].map((item, index) => (
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
                    index === 0 ? 'bg-primary text-white' : 'text-muted',
                  )}
                  key={item}
                >
                  <span className="size-2 rounded-full bg-current opacity-70" />
                  {item}
                </div>
              ))}
            </div>
            <div className="bg-foreground mt-10 rounded-2xl p-4 text-white">
              <ShieldCheck className="text-primary-soft size-5" />
              <p className="mt-3 text-sm font-bold">Scoped by role.</p>
              <p className="mt-1 text-xs leading-5 text-white/60">
                Members see their own work. Managers see managed projects.
              </p>
            </div>
          </aside>

          <section className="min-w-0 p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">
                  Team operations
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Know what was worked, billed, and delivered.
                </h2>
                <p className="text-muted mt-1 text-sm">
                  A single dashboard for time, projects, people, and client
                  billing.
                </p>
              </div>
              <div className="border-success/15 bg-success/8 text-success inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold">
                <span className="bg-success size-1.5 rounded-full" />
                Live workspace
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardStats.map(({ icon: Icon, label, value }) => (
                <Card className="p-4" key={label}>
                  <div className="flex items-center justify-between">
                    <span className="text-muted text-xs font-semibold">
                      {label}
                    </span>
                    <Icon className="text-primary size-4" />
                  </div>
                  <p className="mt-5 text-2xl font-extrabold tracking-tight">
                    {value}
                  </p>
                  <p className="text-success mt-1 text-[11px] font-semibold">
                    Updated from live work logs
                  </p>
                </Card>
              ))}
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Billable trend</p>
                    <p className="text-muted text-xs">Hours by week</p>
                  </div>
                  <BarChart3 className="text-primary size-5" />
                </div>
                <div className="mt-8 flex h-48 items-end gap-3">
                  {[38, 54, 48, 70, 64, 82, 76, 100, 86, 118, 108, 132].map(
                    (height, index) => (
                      <div
                        className={cn(
                          'flex-1 rounded-t-md transition-colors',
                          index > 8
                            ? 'bg-primary hover:bg-primary-hover'
                            : 'bg-primary/18 hover:bg-primary/40',
                        )}
                        key={index}
                        style={{ height }}
                      />
                    ),
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Recent work</p>
                    <p className="text-muted text-xs">Ready for reports</p>
                  </div>
                  <span className="text-primary text-xs font-bold">
                    View all
                  </span>
                </div>
                <div className="divide-border mt-5 divide-y">
                  {sampleActivity.map(([task, client, hours]) => (
                    <div
                      className="flex items-center gap-3 py-4 first:pt-0"
                      key={task}
                    >
                      <span className="bg-surface-strong text-primary grid size-9 shrink-0 place-items-center rounded-xl">
                        <Check className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{task}</p>
                        <p className="text-muted truncate text-xs">{client}</p>
                      </div>
                      <span className="text-xs font-bold">{hours}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-balance sm:text-5xl">
        {title}
      </h2>
      <p className="text-muted mx-auto mt-5 max-w-2xl text-base leading-7 text-balance">
        {description}
      </p>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen overflow-hidden">
      <header className="border-border/70 bg-background/88 sticky top-0 z-20 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Brand />
          <nav className="text-muted hidden items-center gap-8 text-sm font-semibold md:flex">
            <Link className="hover:text-foreground transition" to="/features">
              Features
            </Link>
            <Link className="hover:text-foreground transition" to="/pricing">
              Pricing
            </Link>
            <Link className="hover:text-foreground transition" to="/about">
              About
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild className="hidden sm:inline-flex" variant="ghost">
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/register">
                Start free <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative px-5 pt-18 pb-20 lg:px-8 lg:pt-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(135deg,#fff7ee_0%,#ffffff_48%,#e9f6f0_100%)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="border-primary/15 text-primary mx-auto mb-7 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-bold shadow-sm">
              <Sparkles className="size-3.5" />
              Time tracking, teams, reports, and billing
            </div>
            <h1 className="text-5xl leading-[0.98] font-extrabold tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
              Run client work from timer to paid invoice.
            </h1>
            <p className="text-muted mx-auto mt-8 max-w-2xl text-base leading-7 text-balance sm:text-lg">
              WorkNavo helps freelancers and small service teams track work,
              control role visibility, review project activity, generate
              reports, and invoice without rebuilding the same data twice.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/register">
                  Create workspace <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#features">See features</a>
              </Button>
            </div>
            <div className="text-muted mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold">
              <span>Solo or company workspaces</span>
              <span>Role-based access</span>
              <span>PDF reports and invoices</span>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section
          className="border-border border-y bg-white px-5 py-24 lg:px-8"
          id="features"
        >
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              description="A Clockify-style feature set shaped for client-facing service work: simple time capture, scoped teams, billing, reporting, and operational analytics."
              eyebrow="Feature platform"
              title="Everything your team needs before the invoice."
            />
            <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {platformFeatures.map(({ description, icon: Icon, title }) => (
                <Card
                  className="group hover:border-primary/20 p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
                  key={title}
                >
                  <span className="bg-primary-soft/45 text-primary grid size-12 place-items-center rounded-2xl transition-transform group-hover:scale-105">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-7 text-lg font-extrabold">{title}</h3>
                  <p className="text-muted mt-3 text-sm leading-6">
                    {description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-24 lg:px-8" id="teams">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
                Role routing
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-balance sm:text-5xl">
                Give every role the right workspace, not the whole company.
              </h2>
              <p className="text-muted mt-5 text-base leading-7">
                The product is being shaped around business-safe visibility:
                owners see everything, project managers see managed projects,
                finance sees billing, and members see their own work.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {useCases.map((item) => (
                  <span
                    className="border-border rounded-full border bg-white px-4 py-2 text-xs font-bold"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="border-border text-muted grid grid-cols-[1fr_1fr_1fr] border-b bg-white px-5 py-3 text-xs font-extrabold">
                <span>Role</span>
                <span>Scope</span>
                <span>Focus</span>
              </div>
              <div className="divide-border divide-y bg-white">
                {roleRows.map(([role, scope, focus]) => (
                  <div
                    className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[1fr_1fr_1fr]"
                    key={role}
                  >
                    <div className="font-extrabold">{role}</div>
                    <div className="text-muted">{scope}</div>
                    <div className="text-muted">{focus}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="px-5 py-20 lg:px-8" id="setup">
          <Card className="bg-foreground mx-auto grid max-w-7xl gap-8 overflow-hidden p-8 text-white sm:p-12 lg:grid-cols-[1fr_340px] lg:items-center">
            <div className="max-w-2xl">
              <div className="text-primary-soft flex items-center gap-2 text-sm font-bold">
                <UserCheck className="size-5" />
                Ready for client-facing teams
              </div>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Bring your client work into one clear workspace.
              </h2>
              <p className="mt-4 leading-7 text-white/60">
                Invite your team, assign projects, track work, send reports, and
                prepare invoices from the same trusted data.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link to="/register">
                    Start free <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/login">Log in</Link>
                </Button>
              </div>
            </div>
            <div className="text-foreground rounded-2xl bg-white p-5">
              <p className="text-muted mb-4 text-xs font-bold tracking-[0.16em] uppercase">
                What you get
              </p>
              <div className="space-y-3 text-sm font-bold">
                {[
                  'Team time tracking',
                  'Project roles and visibility',
                  'Client reports and PDF invoices',
                ].map((item) => (
                  <div className="flex items-center gap-3" key={item}>
                    <span className="bg-success/10 text-success grid size-7 place-items-center rounded-full">
                      <Check className="size-4" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>
      </main>
      <footer className="border-border bg-white px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <div className="text-muted flex flex-wrap gap-5 font-semibold">
            <Link className="hover:text-foreground" to="/features">
              Features
            </Link>
            <Link className="hover:text-foreground" to="/pricing">
              Pricing
            </Link>
            <Link className="hover:text-foreground" to="/about">
              About
            </Link>
            <Link className="hover:text-foreground" to="/terms">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
