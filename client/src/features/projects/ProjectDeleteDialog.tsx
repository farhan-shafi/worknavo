import type { Project } from '@clientflow/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
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
import { clientQueryKeys } from '../clients/client.queries';
import { ApiError } from '../../lib/api-client';
import { projectApi } from './project.api';
import { projectQueryKeys } from './project.queries';

interface ProjectDeleteDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectDeleteDialog({
  onOpenChange,
  open,
  project,
}: ProjectDeleteDialogProps) {
  const queryClient = useQueryClient();
  const deleteProject = useMutation({
    mutationFn: () => projectApi.delete(project?.id ?? ''),
    onSuccess: ({ message }) => {
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success(message);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to delete this project.',
      );
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <span className="bg-danger/8 text-danger mb-4 grid size-11 place-items-center rounded-2xl">
            <AlertTriangle className="size-5" />
          </span>
          <DialogTitle>Delete {project?.name ?? 'this project'}?</DialogTitle>
          <DialogDescription>
            This permanently removes the project. Projects with saved work logs
            must have those entries cleared first.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleteProject.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={deleteProject.isPending}
            onClick={() => deleteProject.mutate()}
            variant="danger"
          >
            {deleteProject.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {deleteProject.isPending ? 'Deleting…' : 'Delete project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
