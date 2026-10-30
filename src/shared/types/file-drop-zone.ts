import type { ReactElement, DragEventHandler } from 'react';

/** Зона переноса файлов: использует разметку единственного дочернего элемента */
export interface FileDropZoneProps {
  accept: string;
  onFiles: (files: File[]) => void;
  isDisabled?: boolean | undefined;
  children: ReactElement;
}

/** Подсветка зоны и обработчики переноса файлов */
export interface UseFileDropZoneResult {
  className: string;
  onDragEnter: DragEventHandler<HTMLElement>;
  onDragOver: DragEventHandler<HTMLElement>;
  onDragLeave: DragEventHandler<HTMLElement>;
  onDrop: DragEventHandler<HTMLElement>;
}
