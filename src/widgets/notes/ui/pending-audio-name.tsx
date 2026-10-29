import { Mic } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PendingAudioNameProps } from '../types/pending-item';

/** Имя аудиофайла заметки в очереди */
export function PendingAudioName({ file }: PendingAudioNameProps): ReactNode {
  return (
    <>
      <Mic className="size-3.5 text-dim" />
      {file.name}
    </>
  );
}
