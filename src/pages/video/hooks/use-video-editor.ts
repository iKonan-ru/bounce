import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { normalizeUrl } from '@/entities/service';
import { songsQuery } from '@/entities/song';
import type { VideoMaterial, VideoPatch, Video } from '@/entities/video';
import { useQuery } from '@tanstack/react-query';
import type { VideoEditorProps } from '../types/video';

/** Все поля сохраняются вместе; отказ оставляет ввод в форме */
export function useVideoEditor({ video, onSave, isSaving }: VideoEditorProps) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [script, setScript] = useState(video.script);
  const [aspect, setAspect] = useState<Video['aspect'] | ''>(
    video.aspect || ''
  );
  const [song, setSong] = useState(video.song);
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
  const canSave =
    title.trim() !== '' &&
    !isSaving &&
    materials.every(
      (item) => item.name.trim() !== '' && normalizeUrl(item.url) !== null
    );
  const onTitleChange = (event: ChangeEvent<HTMLInputElement>): void =>
    setTitle(event.target.value);
  const onDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>): void =>
    setDescription(event.target.value);
  const onScriptChange = (event: ChangeEvent<HTMLTextAreaElement>): void =>
    setScript(event.target.value);
  const onAspectChange = (value: string): void =>
    setAspect((value as VideoPatch['aspect']) || '');
  const onSongChange = (value: string): void => setSong(value);
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
        title: title.trim(),
        description,
        script,
        aspect,
        song,
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
    title,
    description,
    script,
    aspect,
    song,
    materials,
    songOptions,
    canSave,
    onTitleChange,
    onDescriptionChange,
    onScriptChange,
    onAspectChange,
    onSongChange,
    onMaterialChange,
    onMaterialRemove,
    onMaterialAdd,
    onSubmit,
  };
}
