import { Plus, Trash2 } from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import { VIDEO_ASPECT_OPTIONS } from '@/entities/video';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Input,
  Textarea,
  MenuSelect,
  PropRow,
} from '@/shared/ui';
import { useVideoEditor } from '../hooks/use-video-editor';
import type { VideoEditorProps, MaterialRowProps } from '../types/video';

/** Настройки открываются отдельно, рабочая карточка остается компактной */
export function VideoEditor(props: VideoEditorProps): ReactNode {
  const state = useVideoEditor(props);

  return (
    <Dialog open onOpenChange={props.onClose}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={state.onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Настройки видео</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="video-title">Название</Label>
            <Input
              id="video-title"
              value={state.title}
              onChange={state.onTitleChange}
              maxLength={200}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="video-description">Описание</Label>
            <Textarea
              id="video-description"
              value={state.description}
              onChange={state.onDescriptionChange}
              maxLength={10000}
              rows={2}
            />
          </div>
          <PropRow label="Кадр">
            <MenuSelect
              label="Формат кадра"
              value={state.aspect}
              options={VIDEO_ASPECT_OPTIONS}
              onChange={state.onAspectChange}
            />
          </PropRow>
          {state.songOptions.length > 1 && (
            <PropRow label="Песня">
              <MenuSelect
                label="Связанная песня"
                value={state.song}
                options={state.songOptions}
                onChange={state.onSongChange}
              />
            </PropRow>
          )}
          <div className="grid gap-2">
            <Label htmlFor="video-script">Сценарий</Label>
            <Textarea
              id="video-script"
              value={state.script}
              onChange={state.onScriptChange}
              maxLength={50000}
              rows={6}
            />
          </div>
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-medium">Материалы</legend>
            <div className="flex flex-col gap-3">
              {state.materials.map((item, index) => (
                <MaterialRow
                  key={index}
                  index={index}
                  name={item.name}
                  url={item.url}
                  onChange={state.onMaterialChange}
                  onRemove={state.onMaterialRemove}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={state.onMaterialAdd}
            >
              <Plus className="size-4" />
              Добавить ссылку
            </Button>
          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={props.onClose}
              disabled={props.isSaving}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={!state.canSave}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Пара имени и адреса рабочего материала */
function MaterialRow({
  index,
  name,
  url,
  onChange,
  onRemove,
}: MaterialRowProps): ReactNode {
  const onName = (event: ChangeEvent<HTMLInputElement>): void =>
    onChange(index, 'name', event.target.value);
  const onUrl = (event: ChangeEvent<HTMLInputElement>): void =>
    onChange(index, 'url', event.target.value);
  const onDelete = (): void => onRemove(index);

  return (
    <div className="flex items-center gap-2">
      <div className="grid min-w-0 flex-1 gap-2">
        <Input
          aria-label="Название материала"
          placeholder="Название"
          value={name}
          maxLength={120}
          onChange={onName}
        />
        <Input
          aria-label="Ссылка на материал"
          placeholder="https://..."
          value={url}
          onChange={onUrl}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Удалить материал"
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
