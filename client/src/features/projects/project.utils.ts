import type { Currency } from '@clientflow/shared';

export function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : '';
}
