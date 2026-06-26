import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';

import { EmptyState } from '../../components/shared/EmptyState';
import { PageHeader } from '../../components/shared/PageHeader';
import { request } from '../../lib/api-client';
import { useAuth } from '../auth/use-auth';

interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorMembershipId: string | null;
  summary: Record<string, unknown> | null;
  createdAt: string;
  requestId: string | null;
}

export function AuditPage() {
  const auth = useAuth();
  const events = useQuery({
    queryKey: ['audit-events', auth.organization?.id],
    queryFn: () => request<{ events: AuditEvent[] }>('/audit-events'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        description="Security-sensitive workspace changes with safe metadata and request identifiers."
        eyebrow={auth.organization?.name}
        title="Audit log"
      />
      {events.data?.events.length ? (
        <div className="border-border overflow-hidden rounded-2xl border bg-white">
          {events.data.events.map((event) => (
            <div
              className="border-border grid gap-2 border-b p-5 last:border-b-0 sm:grid-cols-[1fr_auto]"
              key={event.id}
            >
              <div>
                <p className="font-extrabold">
                  {event.action.replaceAll('_', ' ').replaceAll('.', ' · ')}
                </p>
                <p className="text-muted mt-1 text-xs">
                  {event.entityType}
                  {event.entityId ? ` · ${event.entityId}` : ''}
                  {event.requestId ? ` · request ${event.requestId}` : ''}
                </p>
              </div>
              <time className="text-muted text-xs">
                {new Date(event.createdAt).toLocaleString()}
              </time>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Role, assignment, invitation, and settings changes will appear here."
          icon={ShieldCheck}
          title="No audit events yet"
        />
      )}
    </div>
  );
}
