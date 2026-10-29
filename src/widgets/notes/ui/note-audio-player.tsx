import type { ReactNode } from 'react';
import { AudioPlayer } from '@/features/player';
import { getDisplayFileName } from '@/shared/utils';
import type { NoteAudioPlayerProps } from '../types/note-item';

/** Плеер аудио заметки: имя - как у файла на диске автора, иначе имя на сервере */
export function NoteAudioPlayer({
  note,
  fileName,
  index,
}: NoteAudioPlayerProps): ReactNode {
  const name = note.audio_names?.[index] || getDisplayFileName(fileName);

  return (
    <AudioPlayer
      record={note}
      file={fileName}
      name={name}
      // для системы, что играет: теги MP3, иначе имя файла
      shouldReadTags
    />
  );
}
