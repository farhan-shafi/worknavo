import { endOfWeek, format, startOfWeek } from 'date-fns';

export function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

export function formatReportRange(start: string, end: string) {
  return `${format(new Date(start), 'MMM d, yyyy')} – ${format(
    new Date(end),
    'MMM d, yyyy',
  )}`;
}

export function parseHighlightsInput(value: string) {
  return [
    ...new Set(
      value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
}

export function currentWeekRange() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  return {
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
  };
}
