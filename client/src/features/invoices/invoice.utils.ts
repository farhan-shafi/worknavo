import { format } from 'date-fns';

export function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

export function formatInvoiceDate(value: string) {
  return format(new Date(value), 'MMM d, yyyy');
}
