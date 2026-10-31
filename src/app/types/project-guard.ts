import type { Project, ProjectDirection } from '@/entities/project';

/** Результат хука охраны проекта */
export interface UseProjectGuardResult {
  /** Проекта нет или доступ к нему закрыли */
  isGone: boolean;
  projectId: string;
  project: Project | undefined;
  isMaterialList: boolean;
  direction: ProjectDirection;
}
