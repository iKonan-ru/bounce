import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { normalizeUrl } from '@/entities/service';
import { songsQuery } from '@/entities/song';
import type { VideoMaterial, VideoPatch, Video } from '@/entities/video';
import { useQuery } from '@tanstack/react-query';
import type { VideoEditorProps } from '../types/video';

/** Свойства сохраняются сразу, список материалов - целиком после проверки адресов */
export function useVideoEditor({ video, onSave, isSaving }: VideoEditorProps) {
  const status = video.status;
  const [description, setDescription] = useState(video.description);
  const [script, setScript] = useState(video.script);
  const aspect = video.aspect || '';
  const song = video.song;
  const [materials, setMaterials] = useState<VideoMaterial[]>(
    video.materials ?? []
  );
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
    setDescription(event.target.value);
  const onScriptChange = (event: ChangeEvent<HTMLTextAreaElement>): void =>
    setScript(event.target.value);
  const onAspectChange = (value: string): void =>
    saveField({ aspect: (value as VideoPatch['aspect']) || '' });
  const onSongChange = (value: string): void => saveField({ song: value });
  const onDescriptionBlur = (): void => {
    if (description !== video.description) {
      saveField({ description });
    }
  };
  const onScriptBlur = (): void => {
    if (script !== video.script) {
      saveField({ script });
    }
  };
  const onMaterialChange = (
    index: number,
    field: 'name' | 'url',
    value: string
  ): void =>
    setMaterials((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  const onMaterialRemove = (index: number): void =>
    setMaterials((current) => current.filter((_, i) => i !== index));
  const onMaterialAdd = (): void =>
    setMaterials((current) => [...current, { name: '', url: '' }]);
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
    } catch {
      // Сообщение об отказе показывает общий обработчик карточки.
    }
  };

  return {
    status,
    description,
    script,
    aspect,
    song,
    materials,
    songOptions,
    canSave,
    onStatusChange,
    onDescriptionChange,
    onDescriptionBlur,
    onScriptBlur,
    onScriptChange,
    onAspectChange,
    onSongChange,
    onMaterialChange,
    onMaterialRemove,
    onMaterialAdd,
    onSubmit,
  };
}
