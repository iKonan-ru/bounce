import type { PendingImage } from '@/shared/types';
import type { Project } from './project';

/** Пропсы аватара проекта */
export interface ProjectAvatarProps {
  project: Project;
  className?: string;
  onPick?: ((file: File) => void) | undefined;
  pending?: PendingImage | undefined;
  /** По пустой - загрузка */
  isInteractive?: boolean;
  /** Загруженную картинку заменить нажатием */
  canReplace?: boolean;
  /** Крестик над картинкой: убрать её */
  onRemove?: (() => void) | undefined;
}
