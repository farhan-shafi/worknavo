import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Camera,
  Check,
  Clock3,
  FileText,
  Globe2,
  ReceiptText,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Brand } from './LandingPage';

const navLinks = [
  ['Features', '/features'],
  ['Pricing', '/pricing'],
  ['About', '/about'],
] as const;

const features: Array<{
  icon: LucideIcon;
  group: string;
  plan: 'Free' | 'Team' | 'Pro';
  items: string[];
}> = [
  {
    icon: Clock3,
    group: 'Time tracking',
    plan: 'Free',
    items: [
      'Live timer and manual work logs',
      'Billable and non-billable time',
      'Project, client, and category context',
      'Personal recent work history',
    ],
  },
  {
    icon: BriefcaseBusiness,
    group: 'Projects',
    plan: 'Free',
    items: [
      'Clients, projects, and categories',
      'Project assignments',
      'Project team views',
      'Budget and work context',
    ],
  },
  {
    icon: UsersRound,
    group: 'Team control',
    plan: 'Team',
    items: [
      'Owner, Admin, Project Manager, Finance, Member, Viewer',
      'Scoped team visibility',
      'Project manager routing',
      'Work-log rules and lock windows',
    ],
  },
  {
    icon: BarChart3,
    group: 'Reports',
    plan: 'Team',
    items: [
      'Team analytics',
      'CSV export',
      'Utilization views',
      'PDF client reports',
    ],
  },
  {
    icon: FileText,
    group: 'Billing records',
    plan: 'Free',
    items: [
      'PDF invoices',
      'Billable work-log selection',
      'Invoice status tracking',
      'Downloadable records',
    ],
  },
  {
    icon: ReceiptText,
    group: 'Expenses',
    plan: 'Pro',
    items: [
      'Billable expenses',
      'Receipt attachments',
      'Invoice inclusion',
      'Client/project expense filters',
    ],
  },
  {
    icon: Camera,
    group: 'Proof',
    plan: 'Pro',
    items: [
      'GPS start/stop proof',
      'Screenshot proof',
      'Privacy-first visibility',
      'No silent background capture',
    ],
  },
  {
    icon: Globe2,
    group: 'Automation and security',
    plan: 'Pro',
    items: [
      'Scheduled email reports',
      'httpOnly sessions',
      'Permission-scoped API data',
      'Audit trail',
    ],
  },
];

const proofPrinciples = [
  'GPS is captured only when a timer starts or stops.',
  'Screenshot proof requires visible user action and an active timer.',
  'Proof data is for accountability, not hidden surveillance.',
];

const featureComparison = [
  {
    feature: 'Timer, manual logs, clients, projects, PDF reports, invoices',
    free: true,
    team: true,
    pro: true,
  },
  {
    feature: 'Team roles, project teams, analytics, CSV export',
    free: false,
    team: true,
    pro: true,
  },
  {
    feature: 'Work-log required fields, lock windows, invoice rounding',
    free: false,
    team: true,
    pro: true,
  },
  {
    feature: 'Expenses, GPS proof, screenshot proof, scheduled reports',
    free: false,
    team: false,
    pro: true,
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    description: 'For solo users validating the workflow.',
    cta: 'Start free',
    highlighted: false,
    included: [
      'Clients and projects',
      'Timer and manual work logs',
      'PDF reports',
      'PDF invoices',
      'Profile and workspace settings',
    ],
    locked: [
      'Work-log rules',
      'Team analytics',
      'Expenses',
      'GPS and screenshot proof',
      'Scheduled reports',
    ],
  },
  {
    name: 'Team',
    price: '$8',
    suffix: 'user/month',
    description: 'For small teams that need visibility and exports.',
    cta: 'Start Team workspace',
    highlighted: true,
    included: [
      'Everything in Free',
      'Role-aware team workspace',
      'Project team visibility',
      'Team analytics',
      'CSV export',
      'Work-log rules and lock windows',
    ],
    locked: ['Expenses', 'GPS and screenshot proof', 'Scheduled reports'],
  },
  {
    name: 'Pro',
    price: '$15',
    suffix: 'user/month',
    description: 'For teams that need proof, automation, and billing depth.',
    cta: 'Start Pro workspace',
    highlighted: false,
    included: [
      'Everything in Team',
      'Expenses and invoice inclusion',
      'GPS proof',
      'Screenshot proof',
      'Scheduled email reports',
      'Advanced invoice workflow',
    ],
    locked: [],
  },
];

const aboutCards: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: BriefcaseBusiness,
    title: 'Built around service work',
    description:
      'Projects, clients, work logs, reports, and invoices stay connected from the beginning.',
  },
  {
    icon: ShieldCheck,
    title: 'Designed for trust',
    description:
      'Role routing and scoped API responses help protect team and client data.',
  },
  {
    icon: UsersRound,
    title: 'Ready to grow',
    description:
      'Start solo, invite a team later, and add financial/proof workflows when the business needs them.',
  },
];

function MarketingHeader() {
  return (
    <header className="border-border/70 bg-background/88 sticky top-0 z-20 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Brand />
        <nav className="text-muted hidden items-center gap-8 text-sm font-semibold md:flex">
          {navLinks.map(([label, href]) => (
            <Link
              className="hover:text-foreground transition"
              key={href}
              to={href}
            >
              {label}
            </Link>
          ))}
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
  );
}

function MarketingFooter() {
  return (
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
  );
}

function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="px-5 py-20 text-center lg:px-8">
      <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
        {eyebrow}
      </p>
      <h1 className="mx-auto mt-5 max-w-4xl text-5xl leading-[1] font-extrabold tracking-[-0.055em] text-balance sm:text-6xl">
        {title}
      </h1>
      <p className="text-muted mx-auto mt-6 max-w-2xl text-base leading-7 text-balance">
        {description}
      </p>
    </section>
  );
}

export function FeaturesPage() {
  return (
    <MarketingShell>
      <PageHero
        description="A focused feature set for service businesses that bill by time: capture work, control visibility, report progress, and invoice from the same data."
        eyebrow="Features"
        title="Everything between work started and invoice sent."
      />
      <section className="px-5 pb-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map(({ group, icon: Icon, items, plan }) => (
            <Card className="p-6" key={group}>
              <span className="bg-primary-soft/45 text-primary grid size-12 place-items-center rounded-2xl">
                <Icon className="size-5" />
              </span>
              <div className="mt-6 flex items-center justify-between gap-3">
                <h2 className="font-extrabold">{group}</h2>
                <span className="border-border rounded-full border px-2 py-1 text-[10px] font-extrabold">
                  {plan}
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {items.map((item) => (
                  <div className="flex gap-2 text-sm" key={item}>
                    <Check className="text-success mt-0.5 size-4 shrink-0" />
                    <span className="text-muted">{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-border border-y bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
              Plan access
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em]">
              Free starts the workflow. Team and Pro unlock the operating layer.
            </h2>
            <p className="text-muted mt-5 leading-7">
              During beta, workspace owners can switch plans directly inside
              Settings to test what each tier unlocks before payment is added.
            </p>
          </div>
          <Card className="overflow-hidden">
            <div className="border-border text-muted grid grid-cols-[1.6fr_0.55fr_0.55fr_0.55fr] border-b px-5 py-3 text-xs font-extrabold">
              <span>Feature</span>
              <span>Free</span>
              <span>Team</span>
              <span>Pro</span>
            </div>
            <div className="divide-border divide-y">
              {featureComparison.map((row) => (
                <div
                  className="grid grid-cols-[1.6fr_0.55fr_0.55fr_0.55fr] gap-3 px-5 py-4 text-sm"
                  key={row.feature}
                >
                  <span className="font-semibold">{row.feature}</span>
                  {(['free', 'team', 'pro'] as const).map((plan) => (
                    <span key={plan}>
                      {row[plan] ? (
                        <Check className="text-success size-4" />
                      ) : (
                        <X className="text-muted size-4" />
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="px-5 py-20 lg:px-8">
        <Card className="bg-foreground mx-auto max-w-5xl p-8 text-white sm:p-10">
          <p className="text-primary-soft text-xs font-extrabold tracking-[0.18em] uppercase">
            Proof without spying
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em]">
            Proof features are built to be visible and consent-led.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {proofPrinciples.map((item) => (
              <div className="flex gap-3 text-sm leading-6" key={item}>
                <ShieldCheck className="text-primary-soft mt-0.5 size-5 shrink-0" />
                <span className="text-white/70">{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </MarketingShell>
  );
}

export function PricingPage() {
  return (
    <MarketingShell>
      <PageHero
        description="Start with the free workflow, then select Team or Pro inside Settings when you want to test locked team, proof, expense, and automation features."
        eyebrow="Pricing"
        title="Three simple plans for client-facing teams."
      />
      <section className="px-5 pb-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card
              className={`p-6 ${plan.highlighted ? 'border-primary shadow-xl shadow-orange-900/10' : ''}`}
              key={plan.name}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold">{plan.name}</h2>
                  <p className="text-muted mt-2 text-sm leading-6">
                    {plan.description}
                  </p>
                </div>
                {plan.highlighted ? (
                  <span className="bg-primary-soft text-primary rounded-full px-3 py-1 text-[10px] font-extrabold">
                    Popular
                  </span>
                ) : null}
              </div>
              <div className="mt-8">
                <span className="text-5xl font-extrabold tracking-[-0.05em]">
                  {plan.price}
                </span>
                {plan.suffix ? (
                  <span className="text-muted ml-2 text-sm font-bold">
                    / {plan.suffix}
                  </span>
                ) : null}
              </div>
              <Button
                asChild
                className="mt-7 w-full"
                variant={plan.highlighted ? 'default' : 'secondary'}
              >
                <Link to="/register">{plan.cta}</Link>
              </Button>

              <div className="mt-7 space-y-3">
                {plan.included.map((item) => (
                  <div className="flex gap-3 text-sm" key={item}>
                    <Check className="text-success mt-0.5 size-4 shrink-0" />
                    <span className="font-semibold">{item}</span>
                  </div>
                ))}
                {plan.locked.map((item) => (
                  <div className="text-muted flex gap-3 text-sm" key={item}>
                    <X className="mt-0.5 size-4 shrink-0" />
                    <span>{item} locked</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <p className="text-muted mx-auto mt-8 max-w-3xl text-center text-sm leading-6">
          Beta note: payments are not connected yet. Workspace owners can switch
          plans in Settings so you can test feature restrictions before the
          payment system is added.
        </p>
      </section>
    </MarketingShell>
  );
}

export function AboutPage() {
  return (
    <MarketingShell>
      <PageHero
        description="WorkNavo is built for freelancers and small service companies that need less admin mess between delivery and getting paid."
        eyebrow="About"
        title="A practical operating system for client work."
      />
      <section className="px-5 pb-24 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {aboutCards.map(({ description, icon: FeatureIcon, title }) => {
            return (
              <Card className="p-6" key={title}>
                <FeatureIcon className="text-primary size-7" />
                <h2 className="mt-5 font-extrabold">{title}</h2>
                <p className="text-muted mt-3 text-sm leading-6">
                  {description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </MarketingShell>
  );
}

export function TermsPage() {
  return (
    <MarketingShell>
      <PageHero
        description="Plain-English starter terms for using the product during testing. Replace with lawyer-reviewed terms before charging real customers."
        eyebrow="Terms"
        title="Terms and conditions."
      />
      <section className="px-5 pb-24 lg:px-8">
        <Card className="mx-auto max-w-4xl p-6 sm:p-8">
          <div className="prose prose-slate max-w-none">
            <h2>Use of the service</h2>
            <p>
              WorkNavo is provided for managing client work, team time, reports,
              invoices, and related business records. Users are responsible for
              the accuracy of data they enter.
            </p>
            <h2>Accounts and access</h2>
            <p>
              You are responsible for keeping your login secure and for
              assigning the correct roles and permissions inside your workspace.
            </p>
            <h2>Uploads and proof tracking</h2>
            <p>
              Uploaded profile images and screenshot proofs must be content you
              have the right to store. GPS and screenshot proof features should
              only be used with clear team consent.
            </p>
            <h2>Billing records</h2>
            <p>
              Reports and invoices generated by the app should be reviewed
              before sending to clients. The app does not provide accounting,
              tax, or legal advice.
            </p>
            <h2>Availability</h2>
            <p>
              During testing, the service may change frequently. For production
              use, add backups, monitoring, privacy policy, support process, and
              lawyer-reviewed terms.
            </p>
          </div>
        </Card>
      </section>
    </MarketingShell>
  );
}
