import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ApiError, request } from '../../lib/api-client';
import { AuthShell } from './AuthShell';
import { sessionQueryKey } from './use-auth';

export function ReplaceTemporaryPasswordPage() {
  const [password, setPassword] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const replace = useMutation({
    mutationFn: () =>
      request<{ message: string }>('/auth/replace-temporary-password', {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    onSuccess: async ({ message }) => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      toast.success(message);
      navigate('/app/dashboard', { replace: true });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Could not replace the temporary password.',
      ),
  });

  return (
    <AuthShell
      description="For security, the one-time password cannot be used again after this step."
      eyebrow="Secure your account"
      footer={<span />}
      title="Choose your own password."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          replace.mutate();
        }}
      >
        <div>
          <label className="mb-2 block text-sm font-bold">New password</label>
          <Input
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <p className="text-muted mt-2 text-xs">
            Use uppercase, lowercase, and at least one number.
          </p>
        </div>
        <Button className="w-full" disabled={replace.isPending}>
          {replace.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : null}
          Save new password
        </Button>
      </form>
    </AuthShell>
  );
}
