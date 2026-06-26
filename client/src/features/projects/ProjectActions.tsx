import type { Project } from '@clientflow/shared';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

export function ProjectActions({
  canDelete,
  onDelete,
  onEdit,
  project,
}: {
  canDelete: boolean;
  onDelete: () => void;
  onEdit: () => void;
  project: Project;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Actions for ${project.name}`}
          size="icon"
          variant="ghost"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="size-4" /> Edit project
        </DropdownMenuItem>
        {canDelete ? (
          <DropdownMenuItem
            className="text-danger data-[highlighted]:bg-danger/5"
            onSelect={onDelete}
          >
            <Trash2 className="size-4" /> Delete project
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
