import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Camera,
  CircleDollarSign,
  CreditCard,
  FileText,
  ListChecks,
  LoaderCircle,
  Save,
  UserRound,
} from 'lucide-react';
import { type ChangeEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { PageHeader } from '../../components/shared/PageHeader';
import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { ApiError, request } from '../../lib/api-client';
import { authApi } from '../auth/auth.api';
import { sessionQueryKey, useAuth } from '../auth/use-auth';
import { settingsSchema, type SettingsFormValues } from './settings.schemas';

export function SettingsPage() {
  const { organization, permissions, user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const upgradeFeature = searchParams.get('upgrade');
  const currentPlan = organization?.subscriptionPlan ?? 'free';
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: {
      name: user?.name ?? '',
      businessName: organization?.name ?? user?.businessName ?? '',
      businessAddress:
        organization?.businessAddress ?? user?.businessAddress ?? '',
      defaultCurrency:
        organization?.defaultCurrency ?? user?.defaultCurrency ?? 'USD',
      defaultHourlyRate:
        organization?.defaultHourlyRate === null ||
        organization?.defaultHourlyRate === undefined
          ? ''
          : String(organization.defaultHourlyRate),
      invoicePrefix:
        organization?.invoicePrefix ?? user?.invoicePrefix ?? 'INV',
      defaultInvoiceNotes:
        organization?.defaultInvoiceNotes ?? user?.defaultInvoiceNotes ?? '',
      workLogRequireCategory: organization?.workLogRequireCategory
        ? 'true'
        : 'false',
      workLogRequireDescription: organization?.workLogRequireDescription
        ? 'true'
        : 'false',
      workLogMinimumDescriptionLength:
        organization?.workLogMinimumDescriptionLength === undefined ||
        organization.workLogMinimumDescriptionLength === 0
          ? ''
          : String(organization.workLogMinimumDescriptionLength),
      workLogLockAfterDays:
        organization?.workLogLockAfterDays === null ||
        organization?.workLogLockAfterDays === undefined
          ? ''
          : String(organization.workLogLockAfterDays),
      invoiceTimeRoundingMinutes: String(
        organization?.invoiceTimeRoundingMinutes ?? 0,
      ) as SettingsFormValues['invoiceTimeRoundingMinutes'],
    },
  });
  const saveSettings = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      const profile = await authApi.updateSettings({
        name: values.name.trim(),
        businessName: values.businessName.trim() || undefined,
        businessAddress: values.businessAddress.trim() || undefined,
        defaultCurrency: values.defaultCurrency,
        defaultHourlyRate:
          values.defaultHourlyRate === ''
            ? undefined
            : Number(values.defaultHourlyRate),
        invoicePrefix: values.invoicePrefix.trim().toUpperCase(),
        defaultInvoiceNotes: values.defaultInvoiceNotes.trim() || undefined,
      });
      const workspace = permissions.includes('settings.manage')
        ? await request<{
            message: string;
            organization: NonNullable<
              ReturnType<typeof useAuth>['organization']
            >;
          }>('/organizations/current', {
            method: 'PATCH',
            body: JSON.stringify({
              name: values.businessName.trim() || organization?.name,
              businessAddress: values.businessAddress.trim() || null,
              defaultCurrency: values.defaultCurrency,
              defaultHourlyRate:
                values.defaultHourlyRate === ''
                  ? null
                  : Number(values.defaultHourlyRate),
              invoicePrefix: values.invoicePrefix.trim().toUpperCase(),
              defaultInvoiceNotes: values.defaultInvoiceNotes.trim() || null,
              workLogRequireCategory: values.workLogRequireCategory === 'true',
              workLogRequireDescription:
                values.workLogRequireDescription === 'true',
              workLogMinimumDescriptionLength:
                values.workLogMinimumDescriptionLength === ''
                  ? 0
                  : Number(values.workLogMinimumDescriptionLength),
              workLogLockAfterDays:
                values.workLogLockAfterDays === ''
                  ? null
                  : Number(values.workLogLockAfterDays),
              invoiceTimeRoundingMinutes: Number(
                values.invoiceTimeRoundingMinutes,
              ),
            }),
          })
        : null;
      return { profile, workspace };
    },
    onSuccess: ({ profile, workspace }) => {
      queryClient.setQueryData(sessionQueryKey, (current: unknown) =>
        current && typeof current === 'object'
          ? {
              ...current,
              user: profile.user,
              ...(workspace ? { organization: workspace.organization } : {}),
            }
          : current,
      );
      toast.success(workspace?.message ?? profile.message);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        for (const [field, messages] of Object.entries(error.issues)) {
          const message = messages?.[0];
          if (message && field in form.getValues()) {
            form.setError(field as keyof SettingsFormValues, { message });
          }
        }
      }

      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to save your settings.',
      );
    },
  });
  const uploadAvatar = useMutation({
    mutationFn: (imageDataUrl: string) => authApi.updateAvatar(imageDataUrl),
    onSuccess: ({ message, user: updatedUser }) => {
      queryClient.setQueryData(sessionQueryKey, (current: unknown) =>
        current && typeof current === 'object'
          ? {
              ...current,
              user: updatedUser,
            }
          : current,
      );
      toast.success(message);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to update your profile image.',
      );
    },
  });
  const fieldError = (field: keyof SettingsFormValues) =>
    form.formState.errors[field]?.message;
  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Upload a JPG, PNG, or WebP profile image.');
      return;
    }

    if (file.size > 850_000) {
      toast.error('Profile image is too large. Upload an image under 850 KB.');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        uploadAvatar.mutate(reader.result);
      }
    });
    reader.addEventListener('error', () => {
      toast.error('Could not read that image. Try a different file.');
    });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        description="Control the identity and defaults used across your workspace, invoices, reports, and PDFs."
        eyebrow="Workspace"
        title="Settings"
      />

      <SettingsCard
        description="Your current plan controls which advanced modules are available inside this workspace."
        icon={<CreditCard className="size-5" />}
        title="Plan"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant={currentPlan === 'free' ? 'neutral' : 'primary'}>
              {currentPlan.toUpperCase()}
            </Badge>
            <p className="text-muted mt-3 text-sm leading-6">
              Free includes core clients, projects, timers, reports, and
              invoices. Team adds team analytics. Pro adds proof tracking,
              expenses, and scheduled reports.
            </p>
            {upgradeFeature ? (
              <p className="text-primary mt-3 text-sm font-bold">
                This feature is locked on your current plan.
              </p>
            ) : null}
          </div>
          <a
            className="text-primary text-sm font-extrabold hover:underline"
            href="/pricing"
          >
            View pricing
          </a>
        </div>
      </SettingsCard>

      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) => saveSettings.mutate(values))}
      >
        <SettingsCard
          description="Your personal account details and sign-in identity."
          icon={<UserRound className="size-5" />}
          title="Profile"
        >
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <Avatar
              className="size-16 text-base"
              name={user?.name ?? 'User'}
              src={user?.avatarUrl}
            />
            <div>
              <p className="text-sm font-extrabold">Profile image</p>
              <p className="text-muted mt-1 text-xs">
                JPG, PNG, or WebP up to 850 KB.
              </p>
              <label className="border-border hover:border-primary/30 hover:bg-primary-soft/20 mt-3 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold transition">
                {uploadAvatar.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                {uploadAvatar.isPending ? 'Uploading…' : 'Upload photo'}
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadAvatar.isPending}
                  onChange={handleAvatarChange}
                  type="file"
                />
              </label>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormControl error={fieldError('name')} label="Your name" required>
              <Input autoComplete="name" {...form.register('name')} />
            </FormControl>
            <FormControl label="Account email">
              <Input disabled value={user?.email ?? ''} />
            </FormControl>
          </div>
        </SettingsCard>

        <SettingsCard
          description="This information appears on report and invoice PDFs."
          icon={<Building2 className="size-5" />}
          title="Business"
        >
          <div className="space-y-5">
            <FormControl
              error={fieldError('businessName')}
              label="Business name"
            >
              <Input
                autoComplete="organization"
                disabled={!permissions.includes('settings.manage')}
                placeholder="Your studio or company"
                {...form.register('businessName')}
              />
            </FormControl>
            <FormControl
              error={fieldError('businessAddress')}
              label="Business address"
            >
              <Textarea
                className="min-h-24"
                disabled={!permissions.includes('settings.manage')}
                placeholder="Address shown on PDFs"
                {...form.register('businessAddress')}
              />
            </FormControl>
          </div>
        </SettingsCard>

        <SettingsCard
          description="Defaults used when creating projects, work logs, and invoices."
          icon={<CircleDollarSign className="size-5" />}
          title="Billing defaults"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormControl
              error={fieldError('defaultCurrency')}
              label="Default currency"
              required
            >
              <Select
                disabled={!permissions.includes('settings.manage')}
                {...form.register('defaultCurrency')}
              >
                <option value="USD">USD — US Dollar</option>
                <option value="PKR">PKR — Pakistani Rupee</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="EUR">EUR — Euro</option>
              </Select>
            </FormControl>
            <FormControl
              error={fieldError('defaultHourlyRate')}
              label="Default hourly rate"
            >
              <Input
                disabled={!permissions.includes('settings.manage')}
                inputMode="decimal"
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
                {...form.register('defaultHourlyRate')}
              />
            </FormControl>
          </div>
        </SettingsCard>

        <SettingsCard
          description="Set Clockify-style rules that keep team time entries clean before reports and invoices are generated."
          icon={<ListChecks className="size-5" />}
          title="Work log rules"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormControl
              error={fieldError('workLogRequireCategory')}
              label="Require category"
            >
              <Select
                disabled={!permissions.includes('settings.manage')}
                {...form.register('workLogRequireCategory')}
              >
                <option value="false">No — category is optional</option>
                <option value="true">Yes — category is required</option>
              </Select>
            </FormControl>
            <FormControl
              error={fieldError('workLogRequireDescription')}
              label="Require notes"
            >
              <Select
                disabled={!permissions.includes('settings.manage')}
                {...form.register('workLogRequireDescription')}
              >
                <option value="false">No — notes are optional</option>
                <option value="true">Yes — notes are required</option>
              </Select>
            </FormControl>
            <FormControl
              error={fieldError('workLogMinimumDescriptionLength')}
              label="Minimum notes length"
            >
              <Input
                disabled={!permissions.includes('settings.manage')}
                inputMode="numeric"
                min="0"
                placeholder="0"
                step="1"
                type="number"
                {...form.register('workLogMinimumDescriptionLength')}
              />
              <p className="text-muted mt-2 text-xs">
                Leave blank or use 0 to disable a minimum length.
              </p>
            </FormControl>
            <FormControl
              error={fieldError('workLogLockAfterDays')}
              label="Lock member edits after"
            >
              <Input
                disabled={!permissions.includes('settings.manage')}
                inputMode="numeric"
                min="1"
                placeholder="Blank = never lock"
                step="1"
                type="number"
                {...form.register('workLogLockAfterDays')}
              />
              <p className="text-muted mt-2 text-xs">
                Owners/admins can still correct locked entries.
              </p>
            </FormControl>
            <FormControl
              error={fieldError('invoiceTimeRoundingMinutes')}
              label="Invoice time rounding"
            >
              <Select
                disabled={!permissions.includes('settings.manage')}
                {...form.register('invoiceTimeRoundingMinutes')}
              >
                <option value="0">No rounding</option>
                <option value="5">Nearest 5 minutes</option>
                <option value="10">Nearest 10 minutes</option>
                <option value="15">Nearest 15 minutes</option>
                <option value="30">Nearest 30 minutes</option>
              </Select>
              <p className="text-muted mt-2 text-xs">
                Applies when generating invoices from work logs.
              </p>
            </FormControl>
          </div>
        </SettingsCard>

        <SettingsCard
          description="New invoice numbers and notes use these values automatically."
          icon={<FileText className="size-5" />}
          title="Invoice settings"
        >
          <div className="space-y-5">
            <FormControl
              error={fieldError('invoicePrefix')}
              label="Invoice prefix"
              required
            >
              <Input
                className="uppercase"
                disabled={!permissions.includes('settings.manage')}
                placeholder="INV"
                {...form.register('invoicePrefix')}
              />
              <p className="text-muted mt-2 text-xs">
                New invoices will look like{' '}
                {(form.watch('invoicePrefix') || 'INV').toUpperCase()}-0001.
              </p>
            </FormControl>
            <FormControl
              error={fieldError('defaultInvoiceNotes')}
              label="Default invoice notes"
            >
              <Textarea
                className="min-h-28"
                disabled={!permissions.includes('settings.manage')}
                placeholder="Payment instructions or a thank-you note"
                {...form.register('defaultInvoiceNotes')}
              />
            </FormControl>
          </div>
        </SettingsCard>

        <div className="sticky bottom-4 flex justify-end">
          <Button
            className="shadow-xl shadow-orange-900/15"
            disabled={saveSettings.isPending}
            size="lg"
            type="submit"
          >
            {saveSettings.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saveSettings.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SettingsCard({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-border flex gap-4 border-b p-5 sm:p-6">
        <span className="bg-primary-soft text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-extrabold">{title}</h2>
          <p className="text-muted mt-1 text-sm">{description}</p>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </Card>
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
