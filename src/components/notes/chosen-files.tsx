import { Mic, X } from 'lucide-react';
import { fileKey, LocalImage } from '@/components/notes/attachments';
import { fileSize } from '@/lib/format';

// Выбранные для новой заметки файлы: превью картинок и имена аудио, каждый можно убрать.
export function ChosenFiles({
  images,
  audio,
  disabled,
  onImages,
  onAudio,
}: {
  images: File[];
  audio: File[];
  disabled: boolean;
  onImages: (files: File[]) => void;
  onAudio: (files: File[]) => void;
}) {
  if (images.length === 0 && audio.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 px-4 pb-2">
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {images.map((f, i) => (
            <div
              key={fileKey(f)}
              className="relative aspect-square overflow-hidden rounded-md bg-groove"
            >
              <LocalImage file={f} />
              <RemoveButton
                label={`Убрать ${f.name}`}
                disabled={disabled}
                onClick={() => onImages(images.filter((_, j) => j !== i))}
              />
            </div>
          ))}
        </div>
      )}
      {audio.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {audio.map((f, i) => (
            <li
              key={fileKey(f)}
              className="flex max-w-full items-center gap-1 rounded-md bg-groove py-1 pr-1 pl-2 text-xs"
            >
              <Mic className="size-3.5 shrink-0 text-dim" />
              <span className="truncate">{f.name}</span>
              <span className="shrink-0 text-dim">{fileSize(f.size)}</span>
              <button
                type="button"
                aria-label={`Убрать ${f.name}`}
                disabled={disabled}
                onClick={() => onAudio(audio.filter((_, j) => j !== i))}
                className="flex size-6 shrink-0 items-center justify-center rounded text-dim hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RemoveButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
    >
      <X className="size-4" />
    </button>
  );
}
