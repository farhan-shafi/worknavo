import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tags } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '../../components/shared/EmptyState';
import { PageHeader } from '../../components/shared/PageHeader';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ApiError, request } from '../../lib/api-client';
import { useAuth } from '../auth/use-auth';

interface Category {
  id: string;
  name: string;
  color: string;
  defaultBillable: boolean;
  active: boolean;
}

export function CategoriesPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const categories = useQuery({
    queryKey: ['categories', auth.organization?.id],
    queryFn: () => request<{ categories: Category[] }>('/categories'),
  });
  const create = useMutation({
    mutationFn: () =>
      request<{ category: Category }>('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name,
          color: '#E35D22',
          defaultBillable: true,
          active: true,
        }),
      }),
    onSuccess: () => {
      setName('');
      toast.success('Category created.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Could not create category.',
      ),
  });
  const archive = useMutation({
    mutationFn: (id: string) =>
      request(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Category archived.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        description="Keep project and team reporting consistent with an organization-owned category library."
        eyebrow={auth.organization?.name}
        title="Work categories"
      />
      {auth.permissions.includes('categories.manage') ? (
        <form
          className="border-border flex gap-3 rounded-2xl border bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <Input
            onChange={(event) => setName(event.target.value)}
            placeholder="Design, Development, Meetings…"
            value={name}
          />
          <Button disabled={create.isPending || !name.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </form>
      ) : null}
      {categories.data?.categories.length ? (
        <div className="border-border overflow-hidden rounded-2xl border bg-white">
          {categories.data.categories.map((category) => (
            <div
              className="border-border flex items-center gap-3 border-b p-5 last:border-b-0"
              key={category.id}
            >
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <p className="flex-1 font-extrabold">{category.name}</p>
              <Badge variant={category.active ? 'success' : 'neutral'}>
                {category.active ? 'Active' : 'Archived'}
              </Badge>
              {category.defaultBillable ? (
                <Badge variant="neutral">Billable</Badge>
              ) : null}
              {category.active &&
              auth.permissions.includes('categories.manage') ? (
                <Button
                  onClick={() => archive.mutate(category.id)}
                  size="sm"
                  variant="outline"
                >
                  Archive
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Create reusable categories for cleaner project and member reporting."
          icon={Tags}
          title="No categories yet"
        />
      )}
    </div>
  );
}
