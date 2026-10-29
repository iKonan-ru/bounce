import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { SLOT_CLASS_NAME } from '../constants/images';
import type {
  SlotLook,
  ImageSlotProps,
  UseImageSlotResult,
} from '../types/images';
import { cn } from '../utils/cn';
import { useFileUrl } from './use-file-url';

/** Действие по нажатию: открыть загруженную, заменить её или загрузить новую */
function getSlotLook(isOpening: boolean, hasFile: boolean): SlotLook {
  if (isOpening) {
    return {
      action: 'Открыть',
      hoverClassName: 'cursor-zoom-in hover:brightness-95',
    };
  }

  if (hasFile) {
    return { action: 'Заменить', hoverClassName: 'hover:brightness-90' };
  }

  return {
    action: 'Загрузить',
    hoverClassName: 'hover:bg-groove/70 hover:text-ink',
  };
}

/** Что показать в картинке-месте и что делать по нажатию */
export function useImageSlot({
  record,
  file,
  thumb,
  title,
  onPick,
  canZoom = true,
  canReplace = false,
  onRemove,
  className,
}: Omit<
  ImageSlotProps,
  'placeholder' | 'accept' | 'pending'
>): UseImageSlotResult {
  const fileUrl = useFileUrl();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isViewing, setIsViewing] = useState(false);
  const url = fileUrl(record, file, thumb);
  const slotClassName = cn(SLOT_CLASS_NAME, className);

  const hasFile = Boolean(file);
  const canPickFilled = Boolean(file && canReplace && onPick);
  const image = url ? (
    <img src={url} alt="" className="size-full object-cover" />
  ) : null;
  const showPlaceholder = !url && !file;
  const isEmptyStatic = !file && !onPick;
  const isFilledStatic = hasFile && !canZoom && !canPickFilled;
  const isStatic = isEmptyStatic || isFilledStatic;
  const isOpening = hasFile && !canPickFilled;
  const showRemove = Boolean(file && onRemove);
  const { action, hoverClassName } = getSlotLook(isOpening, hasFile);
  const buttonLabel = `${action}: ${title}`;
  const removeLabel = `Убрать: ${title}`;
  const buttonClassName = cn(
    slotClassName,
    'group/slot relative transition-[filter,background-color]',
    hoverClassName
  );
  let viewerSrc: string | undefined;

  if (isViewing) {
    viewerSrc = fileUrl(record, file);
  }

  const downloadUrl = fileUrl(record, file, undefined, true);

  const onSlotClick = (): void => {
    if (isOpening) {
      setIsViewing(true);

      return;
    }

    if (inputRef.current) {
      inputRef.current.click();
    }
  };
  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const pickedFile = event.target.files?.[0];

    if (pickedFile) {
      // поле выбора файла есть только с onPick
      if (onPick) {
        onPick(pickedFile);
      }
    }

    event.target.value = '';
  };
  const onViewerClose = (): void => {
    setIsViewing(false);
  };

  return {
    inputRef,
    slotClassName,
    image,
    showPlaceholder,
    canPickFilled,
    isStatic,
    showRemove,
    buttonLabel,
    removeLabel,
    buttonClassName,
    viewerSrc,
    downloadUrl,
    onSlotClick,
    onFileInputChange,
    onViewerClose,
  };
}
