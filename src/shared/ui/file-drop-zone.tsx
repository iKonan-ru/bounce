import { Slot } from 'radix-ui';
import type { ReactNode } from 'react';
import { useFileDropZone } from '../hooks/use-file-drop-zone';
import type { FileDropZoneProps } from '../types/file-drop-zone';

/** Перенос файлов в существующий блок без дополнительной обёртки */
export function FileDropZone({
  children,
  ...options
}: FileDropZoneProps): ReactNode {
  const dropProps = useFileDropZone(options);

  return <Slot.Root {...dropProps}>{children}</Slot.Root>;
}
