import { getField } from '@/lib/guards';
import { warmImages } from '@/lib/images';
import type { FileRecord } from '@/lib/model';
import { sendRecordForm } from '@/lib/upload';
import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useFileUrl } from './use-file-url';
import {
  type ImageUploader,
  type UseImageUploadResult,
  useImageUpload,
} from './use-image-upload';

/** Параметры загрузки картинки в одно поле записи */
interface UseFieldUploadParams<Saved extends FileRecord> {
  record: FileRecord;
  /** Поле записи с картинкой */
  field: string;
  /** Уменьшенные копии, которые нужны сразу после загрузки */
  thumbs: readonly string[];
  /** Ключ запросов, которые перечитываются после загрузки */
  refresh: QueryKey;
  /** Запись сохранена: получает её новую версию */
  onSaved?: (next: Saved) => void;
}

/** Текст ошибки загрузки картинки в поле записи */
const FIELD_UPLOAD_FAILED = 'Картинка не загрузилась: проверьте соединение';

/** Загрузка картинки в одно поле записи (аватар проекта, аватар пользователя) */
export function useFieldUpload<Saved extends FileRecord>({
  record,
  field,
  thumbs,
  refresh,
  onSaved,
}: UseFieldUploadParams<Saved>): UseImageUploadResult {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const uploadToField: ImageUploader = async (file, onProgress) => {
    const form = new FormData();
    form.set(field, file);
    const next = await sendRecordForm<Saved>(record.collectionName, form, {
      id: record.id,
      onProgress,
    });
    const name = getField(next, field);

    if (typeof name === 'string') {
      await warmImages(thumbs.map((thumb) => fileUrl(next, name, thumb)));
    }

    if (onSaved) {
      onSaved(next);
    }

    await client.invalidateQueries({ queryKey: refresh });
  };

  return useImageUpload(uploadToField, FIELD_UPLOAD_FAILED);
}
