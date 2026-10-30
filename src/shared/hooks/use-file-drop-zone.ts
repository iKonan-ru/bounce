import type { DragEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type {
  FileDropZoneProps,
  UseFileDropZoneResult,
} from '../types/file-drop-zone';
import { cn } from '../utils/cn';
import { checkCanDropFiles, checkIsFileAccepted } from '../utils/file-drop';

/** Подсвечивает все подходящие зоны, блокирует открытие перенесённого файла браузером */
export function useFileDropZone({
  accept,
  onFiles,
  isDisabled = false,
}: Omit<FileDropZoneProps, 'children'>): UseFileDropZoneResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const zoneDepth = useRef(0);

  useEffect(() => {
    let depth = 0;
    const reset = (): void => {
      depth = 0;
      zoneDepth.current = 0;
      setIsAvailable(false);
      setIsOver(false);
    };
    const onEnter = (event: globalThis.DragEvent): void => {
      if (!event.dataTransfer?.types.includes('Files')) {
        return;
      }

      depth += 1;
      setIsAvailable(checkCanDropFiles(event.dataTransfer, accept));
    };
    const onLeave = (): void => {
      depth -= 1;

      if (depth <= 0) {
        reset();
      }
    };
    const onOver = (event: globalThis.DragEvent): void => {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'none';
      }
    };
    const onWindowDrop = (event: globalThis.DragEvent): void => {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
      }

      reset();
    };
    window.addEventListener('dragenter', onEnter, true);
    window.addEventListener('dragleave', onLeave, true);
    window.addEventListener('dragover', onOver, true);
    window.addEventListener('drop', onWindowDrop, true);
    window.addEventListener('dragend', reset);
    window.addEventListener('blur', reset);

    return (): void => {
      window.removeEventListener('dragenter', onEnter, true);
      window.removeEventListener('dragleave', onLeave, true);
      window.removeEventListener('dragover', onOver, true);
      window.removeEventListener('drop', onWindowDrop, true);
      window.removeEventListener('dragend', reset);
      window.removeEventListener('blur', reset);
    };
  }, [accept]);

  const onDragEnter = (): void => {
    zoneDepth.current += 1;
    setIsOver(true);
  };
  const onDragLeave = (): void => {
    zoneDepth.current -= 1;

    if (zoneDepth.current <= 0) {
      setIsOver(false);
    }
  };
  const onDragOver = (event: DragEvent<HTMLElement>): void => {
    if (isDisabled || !checkCanDropFiles(event.dataTransfer, accept)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };
  const onDrop = (event: DragEvent<HTMLElement>): void => {
    if (isDisabled || event.dataTransfer.files.length === 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer.files);
    const accepted = files.filter((file) => checkIsFileAccepted(file, accept));

    if (accepted.length < files.length) {
      toast.error('Некоторые файлы не подходят для этого блока');
    }

    if (accepted.length > 0) {
      onFiles(accepted);
    }
  };
  const className = cn({
    'outline-2 -outline-offset-2 outline-tape/60': isAvailable && !isDisabled,
    'bg-tape/15 outline-tape': isAvailable && isOver && !isDisabled,
  });

  return { className, onDragEnter, onDragLeave, onDragOver, onDrop };
}
