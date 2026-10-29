import { Mic, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { LocalImage } from '@/entities/note';
import { getFileSizeLabel, getFileKey } from '@/shared/utils';
import type {
  ChosenFileProps,
  ChosenFilesProps,
  RemoveButtonProps,
} from '../types/chosen-files';

/** Файлы без файла под номером index */
function getFilesWithout(files: readonly File[], index: number): File[] {
  return files.filter((_file, fileIndex) => fileIndex !== index);
}

/** Выбранная картинка: превью и кнопка "убрать" */
function ChosenImage({
  file,
  index,
  files,
  disabled,
  onFilesChange,
}: ChosenFileProps): ReactNode {
  const removeLabel = `Убрать ${file.name}`;
  const onRemoveClick = (): void => {
    onFilesChange(getFilesWithout(files, index));
  };

  return (
    <div className="relative aspect-square overflow-hidden rounded-md bg-groove">
      <LocalImage file={file} />
      <RemoveButton
        label={removeLabel}
        disabled={disabled}
        onClick={onRemoveClick}
      />
    </div>
  );
}

/** Выбранное аудио: имя, размер и кнопка "убрать" */
function ChosenAudio({
  file,
  index,
  files,
  disabled,
  onFilesChange,
}: ChosenFileProps): ReactNode {
  const removeLabel = `Убрать ${file.name}`;
  const sizeLabel = getFileSizeLabel(file.size);
  const onRemoveClick = (): void => {
    onFilesChange(getFilesWithout(files, index));
  };

  return (
    <li className="flex max-w-full items-center gap-1 rounded-md bg-groove py-1 pr-1 pl-2 text-xs">
      <Mic className="size-3.5 shrink-0 text-dim" />
      <span className="truncate">{file.name}</span>
      <span className="shrink-0 text-dim">{sizeLabel}</span>
      <button
        type="button"
        aria-label={removeLabel}
        disabled={disabled}
        onClick={onRemoveClick}
        className="flex size-6 shrink-0 items-center justify-center rounded text-dim hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

/** Выбранные для новой заметки файлы: превью картинок и имена аудио, каждый можно убрать */
export function ChosenFiles({
  images,
  audio,
  disabled,
  onImagesChange,
  onAudioChange,
}: ChosenFilesProps): ReactNode {
  const hasImages = images.length > 0;
  const hasAudio = audio.length > 0;
  const hasFiles = hasImages || hasAudio;

  if (!hasFiles) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 px-4 pb-2">
      {hasImages && (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {images.map((file, index) => {
            const fileKey = getFileKey(file);

            return (
              <ChosenImage
                key={fileKey}
                file={file}
                index={index}
                files={images}
                disabled={disabled}
                onFilesChange={onImagesChange}
              />
            );
          })}
        </div>
      )}
      {hasAudio && (
        <ul className="flex flex-wrap gap-2">
          {audio.map((file, index) => {
            const fileKey = getFileKey(file);

            return (
              <ChosenAudio
                key={fileKey}
                file={file}
                index={index}
                files={audio}
                disabled={disabled}
                onFilesChange={onAudioChange}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Кнопка "убрать" в углу превью картинки */
function RemoveButton({
  label,
  onClick,
  disabled,
}: RemoveButtonProps): ReactNode {
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
