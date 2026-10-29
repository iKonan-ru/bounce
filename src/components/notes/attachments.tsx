import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const fileKey = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;

// превью выбранной, но ещё не загруженной картинки
export function LocalImage({ file }: { file: File }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <img src={url} alt={file.name} className="size-full object-cover" /> : null;
}

const CELL = 'aspect-square overflow-hidden rounded-md bg-groove';

type Picture = {
  key: string;
  content: ReactNode;
  // картинка с сервера открывается на весь экран; файл на устройстве - только превью
  open?: { label: string; onClick: () => void };
};

// Вложения заметки под текстом: сетка картинок и список аудио - одинаково у отправленной заметки
// и у ждущей отправки. Аудио отправленной - плееры столбиком, ждущей - имена файлов в строку.
export function NoteAttachments({
  images,
  audio,
  audioAs,
  className,
}: {
  images: ReadonlyArray<Picture>;
  audio: ReadonlyArray<{ key: string; content: ReactNode }>;
  audioAs: 'players' | 'names';
  // отступ слева: у отправленной заметки блоки стоят под текстом, правее аватара
  className?: string;
}) {
  return (
    <>
      {images.length > 0 && (
        <div className={cn('mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4', className)}>
          {images.map((p) =>
            p.open ? (
              <button
                key={p.key}
                type="button"
                onClick={p.open.onClick}
                aria-label={p.open.label}
                className={cn('block', CELL)}
              >
                {p.content}
              </button>
            ) : (
              <div key={p.key} className={CELL}>
                {p.content}
              </div>
            ),
          )}
        </div>
      )}
      {audio.length > 0 && (
        <ul
          className={cn(
            'mt-2 flex gap-2',
            audioAs === 'players' ? 'flex-col' : 'flex-wrap',
            className,
          )}
        >
          {audio.map((a) => (
            <li
              key={a.key}
              className={
                audioAs === 'names'
                  ? 'flex items-center gap-1 rounded-md bg-groove px-2 py-1 text-xs'
                  : undefined
              }
            >
              {a.content}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
