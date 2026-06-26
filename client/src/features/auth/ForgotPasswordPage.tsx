import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle, MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { Button } from '../../components/ui/button';
import { ApiError } from '../../lib/api-client';
import { AuthShell } from './AuthShell';
import { FormField } from './FormField';
import { authApi } from './auth.api';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from './auth.schemas';

export function ForgotPasswordPage() {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const resetRequest = useMutation({
    mutationFn: ({ email }: ForgotPasswordFormValues) =>
      authApi.forgotPassword(email),
  });

  return (
    <AuthShell
      description="Enter the email associated with your account."
      eyebrow="Account recovery"
      footer={
        <Link
          className="text-primary inline-flex items-center gap-2 font-bold hover:underline"
          to="/login"
        >
          <ArrowLeft className="size-4" /> Back to login
        </Link>
      }
      title="Reset your password."
    >
      {resetRequest.isSuccess ? (
        <div className="border-success/15 bg-success/5 rounded-2xl border p-6">
          <MailCheck className="text-success size-8" />
          <p className="mt-4 font-extrabold">Request received</p>
          <p className="text-muted mt-2 text-sm leading-6">
            {resetRequest.data.message}
          </p>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit((values) => resetRequest.mutate(values))}
        >
          <FormField
            autoComplete="email"
            error={form.formState.errors.email?.message}
            label="Email address"
            placeholder="you@example.com"
            registration={form.register('email')}
            type="email"
          />
          {resetRequest.error ? (
            <p className="text-danger text-sm font-semibold">
              {resetRequest.error instanceof ApiError
                ? resetRequest.error.message
                : 'Unable to submit the request.'}
            </p>
          ) : null}
          <Button
            className="w-full"
            disabled={resetRequest.isPending}
            size="lg"
          >
            {resetRequest.isPending && (
              <LoaderCircle className="size-4 animate-spin" />
            )}
            Send reset instructions
          </Button>
          <p className="text-muted text-center text-xs leading-5">
            Password reset delivery will use your configured SMTP provider. For
            now, contact the workspace administrator if you are locked out.
          </p>
        </form>
      )}
    </AuthShell>
  );
}
