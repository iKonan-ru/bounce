import type { ReactNode } from 'react';
import 'react-easy-crop/react-easy-crop.css';
import type { AvatarCropDialogProps } from '../types/avatar-crop';
import { CropBody } from './crop-body';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './kit/dialog';

/** Ключ фото: новое фото - с исходным положением и масштабом */
function getCropKey(file: File | null): string {
  if (!file) {
    return '';
  }

  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Что попадёт в кружок аватара: картинку двигают пальцем или мышью, приближают щипком,
 * колёсиком или ползунком
 *
 * "Готово" отдаёт вырезанный квадрат
 */
export function AvatarCropDialog({
  file,
  title = 'Фото профиля',
  onCancel,
  onDone,
}: AvatarCropDialogProps): ReactNode {
  const isOpen = file !== null;
  const cropKey = getCropKey(file);
  const onOpenChange = (isNextOpen: boolean): void => {
    if (!isNextOpen) {
      onCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* новое фото - с исходным положением и масштабом */}
        {file && (
          <CropBody
            key={cropKey}
            file={file}
            onCancel={onCancel}
            onDone={onDone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
