import type { ReactNode } from 'react';
import { ProjectsDirectionsOptions } from '@/shared/api';

/** Направления проекта из серверной схемы */
export const ProjectDirection = ProjectsDirectionsOptions;

export type ProjectDirection = ProjectsDirectionsOptions;

/** Выбор направлений при создании и просмотр в настройках */
export interface ProjectDirectionsProps {
  value: ProjectDirection[];
  children?: ReactNode;
  onChange?: ((directions: ProjectDirection[]) => void) | undefined;
  disabled?: boolean;
}

/** Состояние выбора направлений */
export interface UseProjectDirectionsResult {
  musicId: string;
  musicHintId: string;
  videoId: string;
  videoHintId: string;
  isReadOnly: boolean;
  isMusicDisabled: boolean;
  hasMusic: boolean;
  onMusicChange: (checked: boolean | 'indeterminate') => void;
}
