import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart3,
  Check,
  CircleDollarSign,
  Clock3,
  FileText,
  HeartPulse,
  Layers3,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { api } from '../lib/api-client';
import { cn } from '../lib/utils';

const workflow = [
  {
    icon: UsersRound,
    title: 'Keep clients organized',
    description:
      'Contacts, projects, rates, and history in one calm workspace.',
  },
  {
    icon: Clock3,
    title: 'Log work as it happens',
    description: 'Capture billable hours and the context behind every task.',
  },
  {
    icon: FileText,
    title: 'Generate weekly reports',
    description: 'Turn selected work logs into client-ready progress updates.',
  },
  {
    icon: CircleDollarSign,
    title: 'Invoice without retyping',
    description:
      'Build polished invoices directly from approved billable work.',
  },
];

const sampleActivity = [
  ['Dashboard card refactor', 'Reeves & Sons', '3.5h'],
  ['Responsive layout fixes', 'BrightPixel Studio', '2h'],
  ['Invoice PDF polish', 'NovaTech AI', '4h'],
];

const dashboardStats: Array<{
  label: string;
  value: string;
  icon: LucideIcon;
}> = [
  { label: 'Active clients', value: '12', icon: UsersRound },
  { label: 'Open projects', value: '8', icon: Layers3 },
  { label: 'Hours this month', value: '86.5', icon: Clock3 },
  { label: 'Revenue', value: '$12,480', icon: CircleDollarSign },
];

export function Brand() {
  return (
    <Link className="inline-flex items-center gap-2.5" to="/">
      <span className="bg-foreground shadow-foreground/15 grid size-10 place-items-center rounded-xl text-white shadow-lg">
        <Layers3 className="size-5" />
      </span>
      <span className="text-lg font-extrabold tracking-[-0.035em]">
        Client<span className="text-primary">Flow</span>
      </span>
    </Link>
  );
}

function ApiHealth() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30_000,
  });

  const apiReady = health.isSuccess;
  const databaseReady = health.data?.database.status === 'connected';

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
          apiReady
            ? 'border-success/15 bg-success/8 text-success'
            : 'border-warning/20 bg-warning/10 text-warning-dark',
        )}
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            apiReady ? 'bg-success' : 'bg-warning animate-pulse',
          )}
        />
        {health.isLoading
          ? 'Checking API'
          : apiReady
            ? 'API online'
            : 'API offline'}
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
          databaseReady
            ? 'border-success/15 bg-success/8 text-success'
            : 'border-border text-muted bg-white',
        )}
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            databaseReady ? 'bg-success' : 'bg-muted/40',
          )}
        />
        MongoDB {databaseReady ? 'connected' : 'waiting'}
      </span>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-6xl">
      <div className="bg-primary/20 absolute inset-x-[10%] -top-14 h-36 rounded-full blur-3xl" />
      <Card className="relative overflow-hidden border-white/70 bg-white/90 p-2 shadow-[0_40px_100px_-40px_rgba(113,63,34,0.4)] backdrop-blur">
        <div className="border-border/80 bg-background flex min-h-[580px] overflow-hidden rounded-2xl border">
          <aside className="border-border hidden w-56 shrink-0 flex-col border-r bg-white p-5 md:flex">
            <Brand />
            <div className="mt-10 space-y-2">
              {['Overview', 'Clients', 'Projects', 'Work logs'].map(
                (item, index) => (
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
                ),
              )}
            </div>
            <div className="bg-foreground mt-auto rounded-2xl p-4 text-white">
              <Sparkles className="text-primary-soft size-5" />
              <p className="mt-3 text-sm font-bold">One clean workflow.</p>
              <p className="mt-1 text-xs leading-5 text-white/60">
                From first log to paid invoice.
              </p>
            </div>
          </aside>

          <section className="min-w-0 flex-1 p-5 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">
                  Wednesday, June 24
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Good morning, Farhan.
                </h2>
                <p className="text-muted mt-1 text-sm">
                  Here&apos;s how your client work is moving.
                </p>
              </div>
              <div className="bg-primary-soft/50 text-primary grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold">
                FS
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
                    +12% from last month
                  </p>
                </Card>
              ))}
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Revenue overview</p>
                    <p className="text-muted text-xs">Last six months</p>
                  </div>
                  <BarChart3 className="text-primary size-5" />
                </div>
                <div className="mt-8 flex h-48 items-end gap-3">
                  {[42, 58, 48, 72, 63, 92, 78, 100, 84, 115, 105, 132].map(
                    (height, index) => (
                      <div
                        className="bg-primary/15 hover:bg-primary flex-1 rounded-t-md transition-colors"
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
                    <p className="text-muted text-xs">Today</p>
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

export function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen overflow-hidden">
      <header className="border-border/70 bg-background/80 relative z-20 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Brand />
          <nav className="text-muted hidden items-center gap-8 text-sm font-semibold md:flex">
            <a
              className="hover:text-foreground transition-colors"
              href="#features"
            >
              Features
            </a>
            <a
              className="hover:text-foreground transition-colors"
              href="#workflow"
            >
              How it works
            </a>
            <a
              className="hover:text-foreground transition-colors"
              href="#setup"
            >
              Setup
            </a>
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
        <section className="relative px-5 pt-20 pb-20 lg:px-8 lg:pt-28">
          <div className="bg-primary-soft/40 pointer-events-none absolute top-16 left-[-8rem] size-72 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute top-40 right-[-10rem] size-96 rounded-full bg-[#f4d4a9]/30 blur-3xl" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="border-primary/15 text-primary mx-auto mb-7 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-bold shadow-sm">
              <Sparkles className="size-3.5" />
              Built for focused client work
            </div>
            <h1 className="text-5xl leading-[0.98] font-extrabold tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
              Turn work logs into
              <span className="text-primary relative mx-3 inline-block">
                client-ready
                <svg
                  aria-hidden="true"
                  className="text-primary-soft absolute -bottom-3 left-0 w-full"
                  fill="none"
                  viewBox="0 0 310 18"
                >
                  <path
                    d="M3 14C72 3 171 2 307 8"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="7"
                  />
                </svg>
              </span>
              reports and invoices.
            </h1>
            <p className="text-muted mx-auto mt-8 max-w-2xl text-base leading-7 text-balance sm:text-lg">
              ClientFlow gives freelancers and small agencies one polished place
              to manage projects, track billable work, send weekly updates, and
              get paid.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/register">
                  Build your workflow <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#workflow">Explore the demo</a>
              </Button>
            </div>
          </div>
          <DashboardPreview />
        </section>

        <section
          className="border-border border-y bg-white px-5 py-24 lg:px-8"
          id="workflow"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
                A smoother Friday
              </p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                Log it once. Use it everywhere.
              </h2>
              <p className="text-muted mt-5 text-base leading-7">
                No more rebuilding the same story across notes, status emails,
                and spreadsheets.
              </p>
            </div>
            <div
              className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              id="features"
            >
              {workflow.map(({ description, icon: Icon, title }, index) => (
                <Card
                  className="group hover:border-primary/20 relative overflow-hidden p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
                  key={title}
                >
                  <span className="text-surface-strong absolute top-4 right-5 text-5xl font-black">
                    0{index + 1}
                  </span>
                  <span className="bg-primary-soft/45 text-primary grid size-12 place-items-center rounded-2xl transition-transform group-hover:scale-105 group-hover:rotate-3">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-8 text-lg font-extrabold">{title}</h3>
                  <p className="text-muted mt-3 text-sm leading-6">
                    {description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 lg:px-8" id="setup">
          <Card className="bg-foreground mx-auto flex max-w-7xl flex-col gap-8 overflow-hidden p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-primary-soft flex items-center gap-2 text-sm font-bold">
                <HeartPulse className="size-5" />
                Phase 2 is live
              </div>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Your secure workspace is ready.
              </h2>
              <p className="mt-4 leading-7 text-white/60">
                Create an account, sign in securely, and return to the same
                protected workspace whenever you&apos;re ready to work.
              </p>
            </div>
            <div className="text-foreground shrink-0 rounded-2xl bg-white p-5">
              <p className="text-muted mb-3 text-xs font-bold tracking-[0.16em] uppercase">
                Live services
              </p>
              <ApiHealth />
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
