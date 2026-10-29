import { useQueryClient } from '@tanstack/react-query';
import { sendRecordForm } from '../api/upload';
import { FIELD_UPLOAD_FAILED } from '../constants/image-upload';
import type {
  UseFieldUploadParams,
  UseImageUploadResult,
  ImageUploader,
} from '../types/image-upload';
import type { FileRecord } from '../types/records';
import { getField } from '../utils/guards';
import { warmImages } from '../utils/images';
import { useFileUrl } from './use-file-url';
import { useImageUpload } from './use-image-upload';

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
