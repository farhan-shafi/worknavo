import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Camera,
  Check,
  Clock3,
  FileText,
  Globe2,
  MapPin,
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
  title: string;
  description: string;
  plan: 'Free' | 'Team' | 'Pro';
}> = [
  {
    icon: Clock3,
    title: 'Timers and manual logs',
    description:
      'Track live work or add clean manual entries connected to clients, projects, categories, and billable status.',
    plan: 'Free',
  },
  {
    icon: FileText,
    title: 'PDF reports and invoices',
    description:
      'Generate client-facing summaries and invoices from the same work log data.',
    plan: 'Free',
  },
  {
    icon: UsersRound,
    title: 'Role-aware workspaces',
    description:
      'Give members, project managers, finance users, admins, and owners the right workspace for their job.',
    plan: 'Team',
  },
  {
    icon: BarChart3,
    title: 'Team analytics and CSV export',
    description:
      'Review utilization, member hours, project capacity, billable trends, and export team time data.',
    plan: 'Team',
  },
  {
    icon: ReceiptText,
    title: 'Expenses',
    description:
      'Track reimbursable and billable expenses, then include them in generated invoices.',
    plan: 'Pro',
  },
  {
    icon: Camera,
    title: 'Screenshot proof',
    description:
      'Capture privacy-first manual screenshot proof tied to active timers. No silent screenshots.',
    plan: 'Pro',
  },
  {
    icon: MapPin,
    title: 'GPS proof',
    description:
      'Optionally save start/stop browser location proof without any background tracking.',
    plan: 'Pro',
  },
  {
    icon: Globe2,
    title: 'Scheduled email reports',
    description:
      'Send daily, weekly, or monthly report summaries using your configured email provider.',
    plan: 'Pro',
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
      'Basic reports',
      'PDF invoices',
      'Profile and workspace settings',
    ],
    locked: [
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
    cta: 'Choose Team',
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
    cta: 'Choose Pro',
    highlighted: false,
    included: [
      'Everything in Team',
      'Expenses and invoice inclusion',
      'GPS proof',
      'Screenshot proof',
      'Scheduled email reports',
      'Advanced billing workflow',
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
          {features.map(({ description, icon: Icon, plan, title }) => (
            <Card className="p-6" key={title}>
              <span className="bg-primary-soft/45 text-primary grid size-12 place-items-center rounded-2xl">
                <Icon className="size-5" />
              </span>
              <div className="mt-6 flex items-center justify-between gap-3">
                <h2 className="font-extrabold">{title}</h2>
                <span className="border-border rounded-full border px-2 py-1 text-[10px] font-extrabold">
                  {plan}
                </span>
              </div>
              <p className="text-muted mt-3 text-sm leading-6">{description}</p>
            </Card>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}

export function PricingPage() {
  return (
    <MarketingShell>
      <PageHero
        description="Start with the free workflow, then upgrade when team visibility, proof tracking, expenses, and automation become necessary."
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
