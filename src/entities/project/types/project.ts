import type { User } from '@/entities/user';
import type { ProjectsResponse } from '@/shared/api';

/** Ссылка проекта на страницу в сервисе (entities/service) */
export interface ProjectLink {
  /** Id сервиса из MUSIC_SERVICES или 'other' - тогда своё название name */
  service: string;
  url: string;
  name?: string;
}

export type Project = ProjectsResponse<
  ProjectLink[],
  {
    owner?: User;
    editors?: User[];
    contributors?: User[];
    viewers?: User[];
  }
>;
