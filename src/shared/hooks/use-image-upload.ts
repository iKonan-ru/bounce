import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { getErrorText } from '../api/errors';
import { MAX_IMAGE_BYTES } from '../constants/limits';
import type {
  ImageUploader,
  UseImageUploadResult,
  PendingImage,
} from '../types/image-upload';
import { getFileSizeLabel } from '../utils/format';
import { shrinkImage } from '../utils/images';

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
