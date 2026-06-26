import type { InputHTMLAttributes } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '../../components/ui/input';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  registration: UseFormRegisterReturn;
}

export function FormField({
  error,
  label,
  registration,
  ...props
}: FormFieldProps) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-bold">{label}</span>
      ) : null}
      <Input
        aria-invalid={Boolean(error)}
        className={error ? 'border-danger focus:border-danger' : undefined}
        {...registration}
        {...props}
      />
      {error ? (
        <span className="text-danger mt-1.5 block text-xs font-semibold">
          {error}
        </span>
      ) : null}
    </label>
  );
}
