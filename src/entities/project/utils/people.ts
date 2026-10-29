import type { User } from '@/entities/user';
import { PeopleKind } from '../types/people';
import type { ProjectPerson } from '../types/roles';
import { ProjectRole } from '../types/roles';

/** Показать ли человека проекта при выборе kind; keep - уже назначенные */
export function checkIsShown(
  person: ProjectPerson,
  kind: PeopleKind,
  keep: readonly string[]
): boolean {
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

/** Люди по id - для аватаров в строках */
export function getPeopleById(users: readonly User[]): Map<string, User> {
  return new Map(users.map((user): [string, User] => [user.id, user]));
}
