import type { User } from '@/entities/user';
import type { ProjectsResponse } from '@/shared/api';
import type { ProjectDirection } from './directions';

/** Ссылка проекта на страницу в сервисе (entities/service) */
export interface ProjectLink {
  id: string;
  directions: ProjectDirection[];
  /** Id площадки из MUSIC_SERVICES или 'other' */
  service: string;
  url: string;
  name: string;
}

export type Project = ProjectsResponse<
  ProjectLink[],
  {
    owner?: User;
    editors?: User[];
    contributors?: User[];
    commenters?: User[];
    viewers?: User[];
  }
>;
