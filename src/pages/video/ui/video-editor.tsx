import { Plus, Trash2 } from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import { VIDEO_STATUS_OPTIONS, VIDEO_ASPECT_OPTIONS } from '@/entities/video';
import { GROUP_ROWS } from '@/shared/constants';
import {
  Section,
  Button,
  Input,
  Textarea,
  MenuSelect,
  PropRow,
} from '@/shared/ui';
import { useVideoEditor } from '../hooks/use-video-editor';
import type { VideoEditorProps, MaterialRowProps } from '../types/video';

/** Поля видео на отдельной странице настроек */
export function VideoEditor(props: VideoEditorProps): ReactNode {
  const state = useVideoEditor(props);

  return (
    <form onSubmit={state.onSubmit} className="flex flex-col gap-8">
      <Section title="Видео">
        <div className={GROUP_ROWS}>
          <PropRow label="Статус">
            <MenuSelect
              label="Статус видео"
              value={state.status}
              options={VIDEO_STATUS_OPTIONS}
              onChange={state.onStatusChange}
              disabled={props.isSaving}
            />
          </PropRow>
          <PropRow label="Кадр">
            <MenuSelect
              label="Формат кадра"
              value={state.aspect}
              options={VIDEO_ASPECT_OPTIONS}
              onChange={state.onAspectChange}
              disabled={props.isSaving}
            />
          </PropRow>
          {state.songOptions.length > 1 && (
            <PropRow label="Песня">
              <MenuSelect
                label="Связанная песня"
                value={state.song}
                options={state.songOptions}
                onChange={state.onSongChange}
                disabled={props.isSaving}
              />
            </PropRow>
          )}
        </div>
      </Section>
      <Section title="Описание">
        <Textarea
          id="video-description"
          className="bg-panel dark:bg-panel"
          aria-label="Описание"
          value={state.description}
          onChange={state.onDescriptionChange}
          onFocus={state.onDescriptionFocus}
          onBlur={state.onDescriptionBlur}
          maxLength={10000}
          rows={2}
        />
      </Section>
      <Section title="Сценарий">
        <Textarea
          id="video-script"
          className="bg-panel dark:bg-panel"
          aria-label="Сценарий"
          value={state.script}
          onChange={state.onScriptChange}
          onFocus={state.onScriptFocus}
          onBlur={state.onScriptBlur}
          maxLength={50000}
          rows={6}
        />
      </Section>
      <Section title="Материалы">
        <div className="mb-3 flex flex-col gap-3">
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
        <div className={GROUP_ROWS}>
          <button
            type="button"
            className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-dim transition-colors hover:bg-groove/40 hover:text-ink md:min-h-10"
            onClick={state.onMaterialAdd}
          >
            <Plus className="size-4" />
            Добавить ссылку
          </button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="submit" disabled={!state.canSave}>
            Сохранить
          </Button>
        </div>
      </Section>
    </form>
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
