import type { ReactNode } from 'react';
import { ProjectDirections, MusicReleaseToggle } from '@/entities/project';
import { MembersPicker } from '@/features/project-members';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Input,
  DialogFooter,
  Button,
} from '@/shared/ui';
import { useNewProjectDialog } from '../hooks/use-new-project-dialog';
import type { NewProjectDialogProps } from '../types/projects';

/** Окно нового проекта */
export function NewProjectDialog({
  open,
  onOpenChange,
}: NewProjectDialogProps): ReactNode {
  const {
    isReleaseEnabled,
    onReleaseChange,
    ownerId,
    name,
    roles,
    setRoles,
    directions,
    setDirections,
    isCreating,
    isSubmitDisabled,
    onNameChange,
    onFormSubmit,
    onCancelClick,
  } = useNewProjectDialog(onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onFormSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Новый проект</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Название</Label>
            <Input
              id="project-name"
              required
              autoFocus
              maxLength={120}
              value={name}
              onChange={onNameChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Направления проекта</span>
            <ProjectDirections
              allowEmpty
              value={directions}
              onChange={setDirections}
              disabled={isCreating}
            >
              <MusicReleaseToggle
                checked={isReleaseEnabled}
                disabled={isCreating}
                onCheckedChange={onReleaseChange}
              />
            </ProjectDirections>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Участники</span>
            {ownerId && (
              <MembersPicker
                ownerId={ownerId}
                value={roles}
                onChange={setRoles}
                disabled={isCreating}
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCancelClick}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
