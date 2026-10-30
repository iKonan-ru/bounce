import type { ReactNode } from 'react';
import { ProjectsDirectionsOptions } from '@/shared/api';
import type { LinkProps } from '@tanstack/react-router';

/** Направления проекта из серверной схемы */
export const ProjectDirection = ProjectsDirectionsOptions;

export type ProjectDirection = ProjectsDirectionsOptions;

/** Выбор направлений при создании и просмотр в настройках */
export interface ProjectDirectionsProps {
  value: ProjectDirection[];
  children?: ReactNode;
  onChange?: ((directions: ProjectDirection[]) => void) | undefined;
  disabled?: boolean;
  blockers?: Partial<Record<ProjectDirection, DirectionBlocker>>;
}

/** Причина запрета и место с наполнением */
export interface DirectionBlocker {
  message: string;
  link: LinkProps;
}
