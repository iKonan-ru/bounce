import type { User } from '@/entities/user';
import { useQuery } from '@tanstack/react-query';
import { projectQuery } from '../api/queries';
import { PeopleKind } from '../types/people';
import { checkIsShown } from '../utils/people';
import { getProjectPeople } from '../utils/roles';

/** Люди проекта по порядку ролей: владелец, редакторы, участники, наблюдатели. Пока проект не загружен (или его нет) - никого */
export function useProjectPeople(
  projectId: string | undefined,
  kind: PeopleKind = PeopleKind.All,
  keep: readonly string[] = []
): User[] {
  const project = useQuery({
    ...projectQuery(projectId ?? ''),
    enabled: Boolean(projectId),
  });

  if (!project.data) {
    return [];
  }

  return getProjectPeople(project.data)
    .filter((person) => checkIsShown(person, kind, keep))
    .map((person) => person.user);
}
