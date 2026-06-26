import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';

import { Button } from '../../components/ui/button';
import { ApiError } from '../../lib/api-client';
import { AuthShell } from './AuthShell';
import { FormField } from './FormField';
import { authApi } from './auth.api';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from './auth.schemas';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: '',
      confirmPassword: '',
    },
  });
  const resetPassword = useMutation({
    mutationFn: ({ password, token: resetToken }: ResetPasswordFormValues) =>
      authApi.resetPassword({ token: resetToken, password }),
  });

  return (
    <AuthShell
      description="Choose a new password for your workspace."
      eyebrow="Account recovery"
      footer={
        <Link
          className="text-primary inline-flex items-center gap-2 font-bold hover:underline"
          to="/login"
        >
          <ArrowLeft className="size-4" /> Back to login
        </Link>
      }
      title="Create a new password."
    >
      {resetPassword.isSuccess ? (
        <div className="border-success/15 bg-success/5 rounded-2xl border p-6">
          <CheckCircle2 className="text-success size-8" />
          <p className="mt-4 font-extrabold">Password reset</p>
          <p className="text-muted mt-2 text-sm leading-6">
            {resetPassword.data.message}
          </p>
          <Button asChild className="mt-6 w-full" size="lg">
            <Link to="/login">Go to login</Link>
          </Button>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit((values) => resetPassword.mutate(values))}
        >
          <input type="hidden" {...form.register('token')} />
          {!token ? (
            <p className="text-danger text-sm font-semibold">
              This reset link is missing its token. Request a new password reset
              email.
            </p>
          ) : null}
          <FormField
            autoComplete="new-password"
            error={form.formState.errors.password?.message}
            label="New password"
            placeholder="8+ characters, uppercase and number"
            registration={form.register('password')}
            type="password"
          />
          <FormField
            autoComplete="new-password"
            error={form.formState.errors.confirmPassword?.message}
            label="Confirm password"
            placeholder="Repeat your new password"
            registration={form.register('confirmPassword')}
            type="password"
          />
          {resetPassword.error ? (
            <p className="text-danger text-sm font-semibold">
              {resetPassword.error instanceof ApiError
                ? resetPassword.error.message
                : 'Unable to reset your password.'}
            </p>
          ) : null}
          <Button
            className="w-full"
            disabled={resetPassword.isPending || !token}
            size="lg"
          >
            {resetPassword.isPending && (
              <LoaderCircle className="size-4 animate-spin" />
            )}
            Reset password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
