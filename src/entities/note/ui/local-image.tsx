import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import type { LocalImageProps } from '../types/attachments';

/** Превью выбранной, но ещё не загруженной картинки */
export function LocalImage({ file }: LocalImageProps): ReactNode {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (!url) {
    return null;
  }

  return <img src={url} alt={file.name} className="size-full object-cover" />;
}
