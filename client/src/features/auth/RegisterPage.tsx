import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '../../components/ui/button';
import { ApiError } from '../../lib/api-client';
import { trackEvent } from '../../lib/analytics';
import { AuthShell } from './AuthShell';
import { FormField } from './FormField';
import { authApi } from './auth.api';
import { registerSchema, type RegisterFormValues } from './auth.schemas';
import { sessionQueryKey, useAuth } from './use-auth';

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      businessName: '',
      workspaceType: 'solo',
      password: '',
      acceptTerms: false,
    },
  });
  const registerAccount = useMutation({
    mutationFn: authApi.register,
    onSuccess: async ({ message }, variables) => {
      trackEvent('signup_completed', {
        workspace_type: variables.workspaceType,
      });
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      toast.success(message);
      navigate('/app/dashboard', { replace: true });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to create your account.',
      );
    },
  });

  if (!auth.isLoading && auth.isAuthenticated) {
    return <Navigate replace to="/app/dashboard" />;
  }

  return (
    <AuthShell
      description="Start with a private workspace for your client work. No payment details required."
      eyebrow="Create your workspace"
      footer={
        <>
          Already have an account?{' '}
          <Link className="text-primary font-bold hover:underline" to="/login">
            Log in
          </Link>
        </>
      }
      title="Make client admin feel lighter."
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) =>
          registerAccount.mutate({
            ...values,
            businessName: values.businessName || undefined,
            acceptTerms: true,
          }),
        )}
      >
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <label className="border-border has-[:checked]:border-primary has-[:checked]:bg-primary/5 cursor-pointer rounded-2xl border p-4">
            <input
              className="accent-primary"
              type="radio"
              value="solo"
              {...form.register('workspaceType')}
            />
            <span className="ml-2 font-bold">Just me</span>
            <p className="text-muted mt-1 text-xs">
              A private workspace that can grow into a team later.
            </p>
          </label>
          <label className="border-border has-[:checked]:border-primary has-[:checked]:bg-primary/5 cursor-pointer rounded-2xl border p-4">
            <input
              className="accent-primary"
              type="radio"
              value="company"
              {...form.register('workspaceType')}
            />
            <span className="ml-2 font-bold">Company or team</span>
            <p className="text-muted mt-1 text-xs">
              Invite members and control project and financial access.
            </p>
          </label>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            autoComplete="name"
            error={form.formState.errors.name?.message}
            label="Your name"
            placeholder="Alex Morgan"
            registration={form.register('name')}
          />
          <FormField
            autoComplete="organization"
            error={form.formState.errors.businessName?.message}
            label="Business name"
            placeholder="Optional"
            registration={form.register('businessName')}
          />
        </div>
        <FormField
          autoComplete="email"
          error={form.formState.errors.email?.message}
          label="Email address"
          placeholder="you@example.com"
          registration={form.register('email')}
          type="email"
        />
        <FormField
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          label="Password"
          placeholder="8+ characters, uppercase and number"
          registration={form.register('password')}
          type="password"
        />
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
          <input
            className="accent-primary mt-1 size-4 shrink-0"
            type="checkbox"
            {...form.register('acceptTerms')}
          />
          <span className="text-muted">
            I agree to the terms and understand this is my private WorkNavo
            workspace.
          </span>
        </label>
        {form.formState.errors.acceptTerms ? (
          <p className="text-danger text-xs font-semibold">
            {form.formState.errors.acceptTerms.message}
          </p>
        ) : null}
        <Button
          className="w-full"
          disabled={registerAccount.isPending}
          size="lg"
        >
          {registerAccount.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          {registerAccount.isPending ? 'Creating workspace…' : 'Start free'}
        </Button>
      </form>
    </AuthShell>
  );
}
