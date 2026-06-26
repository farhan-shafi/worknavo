import { format } from 'date-fns';

export function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

export function formatHours(value: number) {
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);

  return `${formatted}h`;
}

export function formatElapsedDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export function formatWorkLogDate(value: string) {
  return format(new Date(value), 'MMM d, yyyy');
}

export function parseTagInput(value: string) {
  return [
    ...new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}
