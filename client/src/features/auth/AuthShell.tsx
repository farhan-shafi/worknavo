import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';

import { WorkNavoLogo } from '../../components/shared/WorkNavoLogo';

interface AuthShellProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description: string;
  footer: ReactNode;
}

const benefits = [
  'Secure, private workspace',
  'Client-ready reporting workflow',
  'Invoices built from billable work',
];

export function AuthShell({
  children,
  description,
  eyebrow,
  footer,
  title,
}: AuthShellProps) {
  return (
    <main className="bg-background grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14">
        <WorkNavoLogo className="w-fit" />

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">
            {title}
          </h1>
          <p className="text-muted mt-4 leading-7">{description}</p>
          <div className="mt-8">{children}</div>
          <div className="text-muted mt-8 text-center text-sm">{footer}</div>
        </div>

        <p className="text-muted text-xs">
          © 2026 WorkNavo. Built for independent work.
        </p>
      </section>

      <aside className="bg-foreground relative hidden min-h-screen overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="bg-primary absolute -top-28 -right-28 size-96 rounded-full opacity-25 blur-3xl" />
        <div className="bg-primary-soft absolute -bottom-36 -left-28 size-[28rem] rounded-full opacity-10 blur-3xl" />
        <div className="relative">
          <div className="text-primary-soft flex items-center gap-2 text-sm font-bold">
            <Sparkles className="size-4" />A calmer client workflow
          </div>
          <blockquote className="mt-8 max-w-2xl text-4xl leading-tight font-extrabold tracking-[-0.045em] xl:text-5xl">
            “Everything between doing the work and getting paid finally lives
            together.”
          </blockquote>
        </div>

        <div className="relative">
          <div className="grid max-w-xl gap-3">
            {benefits.map((benefit) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                key={benefit}
              >
                <CheckCircle2 className="text-primary-soft size-5" />
                <span className="font-semibold">{benefit}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-3 text-sm text-white/55">
            <ShieldCheck className="size-4" />
            Passwords are securely hashed. Sessions use httpOnly cookies.
          </div>
        </div>
      </aside>
    </main>
  );
}
