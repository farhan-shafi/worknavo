import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ApiError, request } from '../../lib/api-client';
import { AuthShell } from '../auth/AuthShell';
import { sessionQueryKey, useAuth } from '../auth/use-auth';

export function AcceptInvitationPage() {
  const auth = useAuth();
  const [search] = useSearchParams();
  const token = search.get('token') ?? '';
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accept = useMutation({
    mutationFn: () =>
      auth.isAuthenticated
        ? request<{ message: string; organizationId: string }>(
            '/invitations/accept',
            {
              method: 'POST',
              body: JSON.stringify({ token }),
            },
          )
        : request<{ message: string }>('/invitations/register-accept', {
            method: 'POST',
            body: JSON.stringify({ token, name, password }),
          }),
    onSuccess: async (result) => {
      toast.success(result.message);
      if (auth.isAuthenticated) {
        await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
        navigate('/app/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'The invitation could not be accepted.',
      ),
  });

  return (
    <AuthShell
      description="Join the workspace and start tracking only the work assigned to you."
      eyebrow="Team invitation"
      footer={<span />}
      title="You have been invited."
    >
      {!token ? (
        <p className="text-danger text-sm font-semibold">
          This invitation link is incomplete.
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            accept.mutate();
          }}
        >
          {!auth.isAuthenticated ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Your name
                </label>
                <Input
                  minLength={2}
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Create password
                </label>
                <Input
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </div>
            </>
          ) : (
            <p className="text-muted text-sm">
              You are signed in as <strong>{auth.user?.email}</strong>.
            </p>
          )}
          <Button className="w-full" disabled={accept.isPending || !token}>
            {accept.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            Accept invitation
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
