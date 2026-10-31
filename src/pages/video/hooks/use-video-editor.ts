import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { normalizeUrl } from '@/entities/service';
import { songsQuery } from '@/entities/song';
import type { VideoMaterial, VideoPatch, Video } from '@/entities/video';
import { useDraft } from '@/shared/hooks';
import { useQuery } from '@tanstack/react-query';
import type { VideoEditorProps } from '../types/video';

/** Свойства сохраняются сразу, список материалов - целиком после проверки адресов */
export function useVideoEditor({ video, onSave, isSaving }: VideoEditorProps) {
  const status = video.status;
  const description = useDraft(video.description);
  const script = useDraft(video.script);
  const aspect = video.aspect || '';
  const song = video.song;
  const [materialDraft, setMaterialDraft] = useState<VideoMaterial[] | null>(
    null
  );
  const materials = materialDraft ?? video.materials ?? [];
  const songs = useQuery(songsQuery(video.project));
  const songOptions = [
    { value: '', label: 'Без песни' },
    ...(songs.data ?? []).map((item) => ({
      value: item.id,
      label: item.title,
    })),
  ];
  const hasMaterialChanges =
    JSON.stringify(materials) !== JSON.stringify(video.materials ?? []);
  const canSave =
    hasMaterialChanges &&
    !isSaving &&
    materials.every(
      (item) => item.name.trim() !== '' && normalizeUrl(item.url) !== null
    );
  const saveField = (patch: VideoPatch): void => {
    void onSave(patch).catch(() => undefined);
  };
  const onStatusChange = (value: Video['status']): void =>
    saveField({ status: value });
  const onDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>): void =>
    description.setDraft(event.target.value);
  const onScriptChange = (event: ChangeEvent<HTMLTextAreaElement>): void =>
    script.setDraft(event.target.value);
  const onAspectChange = (value: string): void =>
    saveField({ aspect: (value as VideoPatch['aspect']) || '' });
  const onSongChange = (value: string): void => saveField({ song: value });
  const onDescriptionBlur = (): void => {
    if (description.finish()) {
      saveField({ description: description.draft });
    }
  };
  const onScriptBlur = (): void => {
    if (script.finish()) {
      saveField({ script: script.draft });
    }
  };
  const onMaterialChange = (
    index: number,
    field: 'name' | 'url',
    value: string
  ): void =>
    setMaterialDraft((current) =>
      (current ?? materials).map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  const onMaterialRemove = (index: number): void =>
    setMaterialDraft((current) =>
      (current ?? materials).filter((_, i) => i !== index)
    );
  const onMaterialAdd = (): void =>
    setMaterialDraft((current) => [
      ...(current ?? materials),
      { name: '', url: '' },
    ]);
  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    try {
      await onSave({
        materials: materials.map((item) => ({
          name: item.name.trim(),
          url: normalizeUrl(item.url) ?? '',
        })),
      });
      setMaterialDraft((current) =>
        current === materialDraft ? null : current
      );
    } catch {
      // Сообщение об отказе показывает общий обработчик карточки.
    }
  };

  return {
    status,
    description: description.draft,
    script: script.draft,
    aspect,
    song,
    materials,
    songOptions,
    canSave,
    onStatusChange,
    onDescriptionChange,
    onDescriptionFocus: description.start,
    onDescriptionBlur,
    onScriptBlur,
    onScriptFocus: script.start,
    onScriptChange,
    onAspectChange,
    onSongChange,
    onMaterialChange,
    onMaterialRemove,
    onMaterialAdd,
    onSubmit,
  };
}
