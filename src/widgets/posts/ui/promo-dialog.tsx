import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Textarea,
  ConfirmDialog,
} from '@/shared/ui';
import { usePromoDialog } from '../hooks/use-promo-dialog';
import type { PromoDialogProps } from '../types/publishing';
import { PublicationFieldsEditor } from './publication-fields';

/** Форма шага видеопромо использует те же поля срока и аккаунта */
export function PromoDialog(props: PromoDialogProps): ReactNode {
  const state = usePromoDialog(props);

  return (
    <>
      <Dialog open onOpenChange={props.onClose}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={state.onSubmit} className="flex flex-col gap-3">
            <DialogHeader>
              <DialogTitle>Промо видео</DialogTitle>
            </DialogHeader>
            <PublicationFieldsEditor
              {...state}
              disabled={!props.canEdit || state.isBusy}
            />
            <div className="grid gap-2">
              <Label htmlFor="promo-comment">Описание</Label>
              <Textarea
                id="promo-comment"
                name="text"
                value={state.fields.text}
                onChange={state.onTextChange}
                rows={3}
                maxLength={3000}
                disabled={!props.canEdit || state.isBusy}
              />
            </div>
            <DialogFooter>
              {props.template && props.canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-led-red sm:mr-auto"
                  onClick={state.onRemove}
                  disabled={state.isBusy}
                >
                  Удалить
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={props.onClose}
                disabled={state.isBusy}
              >
                {props.canEdit ? 'Отмена' : 'Закрыть'}
              </Button>
              {props.canEdit && (
                <Button type="submit" disabled={!state.canSave || state.isBusy}>
                  Сохранить
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={state.isConfirming}
        onOpenChange={state.setIsConfirming}
        title="Удалить шаблон публикации?"
        description="Уже созданные публикации сохранятся."
        confirmLabel="Удалить"
        isBusy={state.isBusy}
        onConfirm={state.onRemoveConfirm}
      />
    </>
  );
}
