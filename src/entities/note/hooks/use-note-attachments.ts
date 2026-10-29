import { cn } from '@/shared/utils';
import type {
  NoteAttachmentsProps,
  UseNoteAttachmentsResult,
} from '../types/attachments';
import { AudioView } from '../types/notes';

/** Логика вложений заметки: что показывать и как */
export function useNoteAttachments({
  images,
  audio,
  audioView,
  className,
}: NoteAttachmentsProps): UseNoteAttachmentsResult {
  const arePlayers = audioView === AudioView.Players;
  const areNames = audioView === AudioView.Names;
  const imagesClassName = cn(
    'mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4',
    className
  );
  const audioClassName = cn(
    'mt-2 flex gap-2',
    { 'flex-col': arePlayers, 'flex-wrap': !arePlayers },
    className
  );
  const audioItemClassName = areNames
    ? 'flex items-center gap-1 rounded-md bg-groove px-2 py-1 text-xs'
    : undefined;

  return {
    hasImages: images.length > 0,
    hasAudio: audio.length > 0,
    imagesClassName,
    audioClassName,
    audioItemClassName,
  };
}
