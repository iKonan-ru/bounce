export { createProject, getRoleFields } from './api/projects';

export { projectQuery, projectsQuery } from './api/queries';

export { MEMBER_ROLES, ROLE_HINT, ROLE_LABEL } from './constants/roles';

export { useAccess } from './hooks/use-access';

export { useProjectPeople } from './hooks/use-project-people';

export { PeopleKind } from './types/people';

export type { Project, ProjectLink } from './types/project';

export type { Roles } from './types/projects';

export { ProjectRole } from './types/roles';

export type { Abilities, MemberRole } from './types/roles';

export { AvatarStack } from './ui/avatar-stack';

export { PeoplePicker } from './ui/people-picker';

export { ProjectAvatar } from './ui/project-avatar';

export {
  forgetProject,
  getLastProject,
  rememberProject,
} from './utils/current-project';

export { getPeopleById } from './utils/people';

export { getProjectPeople } from './utils/roles';
