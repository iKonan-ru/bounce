import { ChevronDown, ImagePlus, Trash2, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { POST_STATUSES, POST_STATUS_LABEL } from '@/entities/post';
import { IMAGE_ACCEPT } from '@/shared/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Textarea,
  Button,
  MenuSelect,
  PropRow,
  Collapse,
  ImageSlot,
  ConfirmDialog,
} from '@/shared/ui';
import { getSafeUrl } from '@/shared/utils';
import { usePublicationDialog } from '../hooks/use-publication-dialog';
import type { PublicationDialogProps } from '../types/publishing';
import { PublicationFieldsEditor } from './publication-fields';

/** Дополнительные поля не занимают место, пока не нужны */
export function PublicationDialog(props: PublicationDialogProps): ReactNode {
  const state = usePublicationDialog(props);
  const disabled = !props.canWork || state.isBusy;
  const publishedUrl = getSafeUrl(state.url);
  const statusOptions = POST_STATUSES.map((value) => ({
    value,
    label: POST_STATUS_LABEL[value],
  }));

  return (
    <>
      <Dialog open onOpenChange={props.onClose}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={state.onSubmit} className="flex flex-col gap-3">
            <DialogHeader>
              <DialogTitle>
                {props.post ? 'Публикация видео' : 'Новая публикация'}
              </DialogTitle>
            </DialogHeader>
            {!props.post && !props.videoId && (
              <PropRow label="Видео">
                <MenuSelect
                  className="max-w-full"
                  label="Видео публикации"
                  value={state.videoId}
                  options={state.videoOptions}
                  onChange={state.setVideoId}
                  disabled={disabled}
                />
              </PropRow>
            )}
            <PublicationFieldsEditor {...state} disabled={disabled} />
            <PropRow label="Статус">
              <MenuSelect
                className="max-w-full"
                label="Статус публикации"
                value={state.status}
                options={statusOptions}
                onChange={state.onStatusChange}
                disabled={disabled}
              />
            </PropRow>
            <Button
              type="button"
              variant="ghost"
              className="justify-start"
              aria-expanded={state.showDetails}
              onClick={state.onDetailsToggle}
            >
              Дополнительно
              <ChevronDown className="size-4" />
            </Button>
            <Collapse isOpen={state.showDetails}>
              <div className="flex flex-col gap-4 pb-2">
                <div className="grid gap-2">
                  <Label htmlFor="publication-text">Описание</Label>
                  <Textarea
                    id="publication-text"
                    name="text"
                    value={state.fields.text}
                    onChange={state.onTextChange}
                    maxLength={10000}
                    rows={4}
                    disabled={disabled}
                  />
                </div>
                <PropRow label="Кто делает">
                  <MenuSelect
                    className="max-w-full"
                    label="Ответственный"
                    value={state.assignee}
                    options={state.peopleOptions}
                    onChange={state.setAssignee}
                    disabled={disabled}
                  />
                </PropRow>
                <div className="grid gap-2">
                  <Label htmlFor="publication-url">Ссылка на публикацию</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="publication-url"
                      type="url"
                      value={state.url}
                      onChange={state.onUrlChange}
                      disabled={disabled}
                      placeholder="https://..."
                    />
                    {publishedUrl && (
                      <a
                        href={publishedUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Открыть публикацию"
                        className="p-2 text-dim"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="publication-preview">Превью</Label>
                  {state.previewUrl && (
                    <img
                      src={state.previewUrl}
                      alt="Новое превью"
                      className="h-24 w-40 rounded-xl object-contain"
                    />
                  )}
                  {!state.previewUrl &&
                    !state.isPreviewRemoved &&
                    props.post?.preview && (
                      <ImageSlot
                        record={props.post}
                        file={props.post.preview}
                        thumb="600x600"
                        title="Превью публикации"
                        placeholder={<ImagePlus />}
                        className="h-24 w-40 rounded-xl"
                      />
                    )}
                  {props.canWork && (
                    <>
                      <input
                        ref={state.fileInputRef}
                        id="publication-preview"
                        type="file"
                        accept={IMAGE_ACCEPT}
                        onChange={state.onFileChange}
                        disabled={disabled}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-self-start"
                        onClick={state.onPickPreview}
                        disabled={disabled}
                      >
                        <ImagePlus className="size-4" />
                        Выбрать превью
                      </Button>
                    </>
                  )}
                  {props.canWork &&
                    (state.previewUrl ||
                      (!state.isPreviewRemoved && props.post?.preview)) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-self-start text-led-red"
                        onClick={state.onPreviewRemove}
                        disabled={disabled}
                      >
                        <Trash2 className="size-4" />
                        Убрать превью
                      </Button>
                    )}
                </div>
              </div>
            </Collapse>
            <DialogFooter>
              {props.post && props.canWork && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-led-red sm:mr-auto"
                  onClick={state.onRemove}
                  disabled={disabled}
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
                {props.canWork ? 'Отмена' : 'Закрыть'}
              </Button>
              {props.canWork && (
                <Button type="submit" disabled={!state.canSubmit}>
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
        title="Удалить публикацию?"
        description="Если публикация основная, связанные сроки останутся без даты."
        confirmLabel="Удалить"
        isBusy={state.isBusy}
        onConfirm={state.onRemoveConfirm}
      />
    </>
  );
}
