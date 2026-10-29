import { useQuery } from '@tanstack/react-query';
import type { User } from './model';
import { projectQuery } from './queries';
import { projectPeople } from './roles';

// Кого из людей проекта показать:
//   all     - всех, в том числе отключённых (аватары: их записи и назначения остаются);
//   active  - кроме отключённых (упоминания);
//   workers - тех, кто может делать работу: не наблюдателей и не отключённых. Упомянуть можно и
//             наблюдателя, но работу ему не назначить (сервер отказывает,
//             pb_hooks/planner.pb.js); уже назначенные (keep) видны в любом случае.
export type PeopleKind = 'all' | 'active' | 'workers';

// Люди проекта по порядку ролей: владелец, редакторы, участники, наблюдатели. Пока проект не
// загружен (или его нет) - никого.
export function useProjectPeople(
  projectId: string | undefined,
  kind: PeopleKind = 'all',
  keep: ReadonlyArray<string> = [],
): User[] {
  const project = useQuery({ ...projectQuery(projectId ?? ''), enabled: Boolean(projectId) });
  if (!project.data) return [];
  return projectPeople(project.data)
    .filter(
      (p) =>
        kind === 'all' ||
        keep.includes(p.user.id) ||
        (!p.user.disabled && (kind === 'active' || p.role !== 'viewer')),
    )
    .map((p) => p.user);
}

// люди по id - для аватаров в строках
export function peopleById(users: ReadonlyArray<User>): Map<string, User> {
  return new Map(users.map((u) => [u.id, u] as const));
}
