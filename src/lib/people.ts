import { useQuery } from '@tanstack/react-query';
import type { User } from './model';
import { projectQuery } from './queries';
import { getProjectPeople, type ProjectPerson, ProjectRole } from './roles';

/**
 * Кого из людей проекта показать
 *
 * - All - всех, в том числе отключённых (аватары: их записи и назначения остаются)
 * - Active - кроме отключённых (упоминания)
 * - Workers - тех, кто может делать работу: не наблюдателей и не отключённых. Упомянуть можно и
 *   наблюдателя, но работу ему не назначить (сервер отказывает, pb_hooks/planner.pb.js); уже
 *   назначенные (keep) видны в любом случае
 */
export enum PeopleKind {
  All = 'all',
  Active = 'active',
  Workers = 'workers',
}

/** Показать ли человека проекта при выборе kind; keep - уже назначенные */
function checkIsShown(person: ProjectPerson, kind: PeopleKind, keep: readonly string[]): boolean {
  if (kind === PeopleKind.All) {
    return true;
  }
  if (keep.includes(person.user.id)) {
    return true;
  }
  if (person.user.disabled) {
    return false;
  }
  return kind === PeopleKind.Active || person.role !== ProjectRole.Viewer;
}

/** Люди проекта по порядку ролей: владелец, редакторы, участники, наблюдатели. Пока проект не загружен (или его нет) - никого */
export function useProjectPeople(
  projectId: string | undefined,
  kind: PeopleKind = PeopleKind.All,
  keep: readonly string[] = [],
): User[] {
  const project = useQuery({ ...projectQuery(projectId ?? ''), enabled: Boolean(projectId) });
  if (!project.data) {
    return [];
  }
  return getProjectPeople(project.data)
    .filter((person) => checkIsShown(person, kind, keep))
    .map((person) => person.user);
}

/** Люди по id - для аватаров в строках */
export function getPeopleById(users: readonly User[]): Map<string, User> {
  return new Map(users.map((user): [string, User] => [user.id, user]));
}
