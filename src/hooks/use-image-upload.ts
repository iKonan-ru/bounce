import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorText } from '@/lib/errors';
import { getFileSizeLabel } from '@/lib/format';
import { shrinkImage } from '@/lib/images';
import { MAX_IMAGE_BYTES } from '@/lib/limits';
import { useMutation } from '@tanstack/react-query';

/** Картинка в пути на сервер: локальная копия для показа и доля отправленного */
export interface PendingImage {
  url: string;
  /** Доля отправленного (0..1) */
  progress: number;
}

/** Отправка картинки: файл и обработчик хода отправки */
export type ImageUploader = (
  file: File,
  onProgress: (fraction: number) => void
) => Promise<unknown>;

/** Загрузка одной картинки */
export interface UseImageUploadResult {
  /** Начать загрузку выбранного файла */
  pick: (file: File) => void;
  /** Картинка в пути на сервер; без загрузки - undefined */
  pending: PendingImage | undefined;
  isBusy: boolean;
}

/**
 * Загрузка одной картинки: сразу видна локальная копия с полоской хода, фото уменьшается до
 * отправки
 *
 * upload отправляет файл и дожидается готовых уменьшенных копий (warmImages), чтобы после
 * загрузки картинка не пропадала; failureText - текст ошибки, если причина неизвестна
 */
export function useImageUpload(
  upload: ImageUploader,
  failureText: string
): UseImageUploadResult {
  const [pending, setPending] = useState<PendingImage>();
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const url = URL.createObjectURL(file);
      setPending({ url, progress: 0 });
      try {
        const shrunkFile = await shrinkImage(file);

        if (shrunkFile.size > MAX_IMAGE_BYTES) {
          throw new RangeError(
            `Картинка больше ${getFileSizeLabel(MAX_IMAGE_BYTES)} не загрузится`
          );
        }

        await upload(shrunkFile, (progress) => setPending({ url, progress }));
      } finally {
        setPending(undefined);
        URL.revokeObjectURL(url);
      }
    },
    onError: (error) => {
      if (error instanceof RangeError) {
        toast.error(error.message);

        return;
      }

      toast.error(getErrorText(error, failureText));
    },
  });
  const pick = (file: File): void => {
    mutation.mutate(file);
  };

  return { pick, pending, isBusy: mutation.isPending };
}
