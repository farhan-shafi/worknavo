import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '../../components/ui/button';
import { ApiError } from '../../lib/api-client';
import { AuthShell } from './AuthShell';
import { FormField } from './FormField';
import { authApi } from './auth.api';
import { loginSchema, type LoginFormValues } from './auth.schemas';
import { sessionQueryKey, useAuth } from './use-auth';

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });
  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: async ({ message }) => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      toast.success(message);
      const destination =
        (location.state as { from?: string } | null)?.from ?? '/app/dashboard';
      navigate(destination, { replace: true });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to log in.',
      );
    },
  });

  if (!auth.isLoading && auth.isAuthenticated) {
    return <Navigate replace to="/app/dashboard" />;
  }

  return (
    <AuthShell
      description="Return to your clients, projects, reports, and invoices."
      eyebrow="Welcome back"
      footer={
        <>
          New to WorkNavo?{' '}
          <Link
            className="text-primary font-bold hover:underline"
            to="/register"
          >
            Create an account
          </Link>
        </>
      }
      title="Pick up where you left off."
    >
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
      >
        <FormField
          autoComplete="email"
          error={form.formState.errors.email?.message}
          label="Email address"
          placeholder="you@example.com"
          registration={form.register('email')}
          type="email"
        />
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-bold" htmlFor="login-password">
              Password
            </label>
            <Link
              className="text-primary text-xs font-bold hover:underline"
              to="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>
          <FormField
            autoComplete="current-password"
            error={form.formState.errors.password?.message}
            id="login-password"
            label=""
            placeholder="Enter your password"
            registration={form.register('password')}
            type="password"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
          <input
            className="accent-primary size-4"
            type="checkbox"
            {...form.register('rememberMe')}
          />
          Keep me signed in
        </label>
        <Button className="w-full" disabled={login.isPending} size="lg">
          {login.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}
