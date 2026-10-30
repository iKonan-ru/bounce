import type { ReactNode } from 'react';
import {
  Section,
  Checkbox,
  Label,
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
    description,
    onChange,
    onOpenChange,
    onConfirm,
  } = useMusicRelease({ project, isOwner });
  const isDisabled = !isOwner || isSaving;
  const confirmLabel = isEnabled ? 'Выключить' : 'Включить';
  const onCancel = (): void => onOpenChange(false);

  return (
    <Section title="Музыка">
      <Label htmlFor="music-release" className="min-h-10">
        <Checkbox
          id="music-release"
          checked={isEnabled}
          disabled={isDisabled}
          onCheckedChange={onChange}
          aria-describedby="music-release-hint"
        />
        Выпуск и продвижение песен
      </Label>
      <p id="music-release-hint" className="mt-2 text-sm text-dim">
        Релизы, музыкальные площадки и промо-план. Без них остаются песни, этапы
        и заметки.
      </p>
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
    </Section>
  );
}
