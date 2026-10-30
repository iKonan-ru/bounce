import type { ReactNode } from 'react';
import { MusicReleaseToggle } from '@/entities/project';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@/shared/ui';
import { useMusicRelease } from '../hooks/use-music-release';
import type { MusicReleaseProps } from '../types/music-release';

/** Выпуск можно выключить без удаления сохраненных релизов и публикаций */
export function MusicRelease({
  project,
  isOwner,
}: MusicReleaseProps): ReactNode {
  const {
    isEnabled,
    isConfirming,
    isSaving,
    isConfirmDisabled,
    title,
    confirmLabel,
    description,
    onChange,
    onOpenChange,
    onConfirm,
  } = useMusicRelease({ project, isOwner });
  const isDisabled = !isOwner || isSaving;
  const onCancel = (): void => onOpenChange(false);

  return (
    <>
      <MusicReleaseToggle
        checked={isEnabled}
        disabled={isDisabled}
        onCheckedChange={onChange}
      />
      {!isOwner && (
        <p className="mt-2 text-sm text-dim">
          Настройку меняет владелец проекта.
        </p>
      )}
      <Dialog open={isConfirming} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
              Отмена
            </Button>
            <Button onClick={onConfirm} disabled={isConfirmDisabled}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
