import type { Project } from '@/entities/project';

/** Общая шапка материалов проекта */
export interface ProjectHeaderProps {
  projectId: string;
  project: Project | undefined;
}
