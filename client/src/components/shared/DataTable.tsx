import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { EmptyState } from './EmptyState';
import type { LucideIcon } from 'lucide-react';

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  className?: string;
  render: (row: Row) => ReactNode;
}

interface DataTableProps<Row> {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  getRowKey: (row: Row) => string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
}

export function DataTable<Row>({
  columns,
  emptyAction,
  emptyDescription,
  emptyIcon,
  emptyTitle,
  getRowKey,
  rows,
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        action={emptyAction}
        description={emptyDescription}
        icon={emptyIcon}
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left">
        <thead>
          <tr className="border-border border-b">
            {columns.map((column) => (
              <th
                className={cn(
                  'text-muted px-5 py-3 text-[11px] font-extrabold tracking-wide uppercase',
                  column.className,
                )}
                key={column.key}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {rows.map((row) => (
            <tr className="hover:bg-surface/60 transition" key={getRowKey(row)}>
              {columns.map((column) => (
                <td
                  className={cn('px-5 py-4 text-sm', column.className)}
                  key={column.key}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
