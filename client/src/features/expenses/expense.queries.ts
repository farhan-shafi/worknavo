import { useQuery } from '@tanstack/react-query';

import { expenseApi } from './expense.api';
import type { ExpenseFilters } from './expense.schemas';

export const expenseQueryKeys = {
  all: ['expenses'] as const,
  list: (filters: ExpenseFilters) =>
    [...expenseQueryKeys.all, 'list', filters] as const,
};

export function useExpenses(filters: ExpenseFilters, enabled = true) {
  return useQuery({
    queryKey: expenseQueryKeys.list(filters),
    queryFn: () => expenseApi.list(filters),
    enabled,
  });
}
