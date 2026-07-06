import { zodResolver } from '@hookform/resolvers/zod';
import type { Client } from '@clientflow/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { ApiError } from '../../lib/api-client';
import { clientApi } from './client.api';
import { clientQueryKeys } from './client.queries';
import { clientFormSchema, type ClientFormValues } from './client.schemas';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

const emptyClient: ClientFormValues = {
  name: '',
  companyName: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  status: 'active',
  notes: '',
};

function valuesFromClient(client?: Client | null): ClientFormValues {
  if (!client) return emptyClient;

  return {
    name: client.name,
    companyName: client.companyName ?? '',
    email: client.email,
    phone: client.phone ?? '',
    website: client.website ?? '',
    address: client.address ?? '',
    status: client.status,
    notes: client.notes ?? '',
  };
}

export function ClientFormDialog({
  client,
  onOpenChange,
  open,
}: ClientFormDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: valuesFromClient(client),
  });
  const saveClient = useMutation({
    mutationFn: (values: ClientFormValues) =>
      client ? clientApi.update(client.id, values) : clientApi.create(values),
    onSuccess: ({ client: savedClient, message }) => {
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      queryClient.setQueryData(
        clientQueryKeys.overview(savedClient.id),
        (current: unknown) =>
          current && typeof current === 'object'
            ? { ...current, client: savedClient }
            : current,
      );
      toast.success(message ?? 'Client saved successfully.');
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        for (const [field, messages] of Object.entries(error.issues)) {
          const message = messages?.[0];
          if (message && field in emptyClient) {
            form.setError(field as keyof ClientFormValues, { message });
          }
        }
      }

      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to save this client.',
      );
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(valuesFromClient(client));
    }
  }, [client, form, open]);

  const fieldError = (field: keyof ClientFormValues) =>
    form.formState.errors[field]?.message;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit client' : 'Add a client'}</DialogTitle>
          <DialogDescription>
            {client
              ? 'Keep contact details and client status up to date.'
              : 'Add the contact details you need for projects, reports, and invoices.'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-6 space-y-5"
          onSubmit={form.handleSubmit((values) => saveClient.mutate(values))}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormControl
              error={fieldError('name')}
              label="Client name"
              required
            >
              <Input
                autoComplete="name"
                placeholder="Alex Morgan"
                {...form.register('name')}
              />
            </FormControl>
            <FormControl error={fieldError('companyName')} label="Company">
              <Input
                autoComplete="organization"
                placeholder="Northstar Studio"
                {...form.register('companyName')}
              />
            </FormControl>
            <FormControl error={fieldError('email')} label="Email" required>
              <Input
                autoComplete="email"
                placeholder="jane@example.com"
                type="email"
                {...form.register('email')}
              />
            </FormControl>
            <FormControl error={fieldError('phone')} label="Phone">
              <Input
                autoComplete="tel"
                placeholder="+1 555 0100"
                {...form.register('phone')}
              />
            </FormControl>
            <FormControl error={fieldError('website')} label="Website">
              <Input
                autoComplete="url"
                placeholder="example.com"
                {...form.register('website')}
              />
            </FormControl>
            <FormControl error={fieldError('status')} label="Status" required>
              <Select {...form.register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </Select>
            </FormControl>
          </div>

          <FormControl error={fieldError('address')} label="Address">
            <Textarea
              className="min-h-20"
              placeholder="Billing or business address"
              {...form.register('address')}
            />
          </FormControl>
          <FormControl error={fieldError('notes')} label="Internal notes">
            <Textarea
              placeholder="Preferences, context, communication notes…"
              {...form.register('notes')}
            />
          </FormControl>

          <DialogFooter>
            <Button
              disabled={saveClient.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={saveClient.isPending} type="submit">
              {saveClient.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {saveClient.isPending
                ? 'Saving…'
                : client
                  ? 'Save changes'
                  : 'Create client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormControl({
  children,
  error,
  label,
  required = false,
}: {
  children: ReactNode;
  error?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">
        {label}
        {required ? <span className="text-primary ml-1">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-danger mt-1.5 block text-xs font-semibold">
          {error}
        </span>
      ) : null}
    </label>
  );
}
