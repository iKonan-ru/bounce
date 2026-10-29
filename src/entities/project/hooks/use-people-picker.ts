import type { User } from '@/entities/user';
import { MAX_LISTED_NAMES } from '../constants/people-picker';
import { PeopleKind } from '../types/people';
import type {
  PeoplePickerProps,
  UsePeoplePickerResult,
} from '../types/people-picker';
import { useProjectPeople } from './use-project-people';

/** Имена на кнопке выбора: "Никто", одно-два имени или первое имя и число остальных */
function getNamesLabel(users: readonly User[]): string {
  if (users.length === 0) {
    return 'Никто';
  }

  if (users.length <= MAX_LISTED_NAMES) {
    return users.map((user) => user.name).join(', ');
  }

  const firstName = users[0]?.name ?? '';
  const restCount = users.length - 1;

  return `${firstName} и ещё ${restCount}`;
}

/** Выбор исполнителей: кого можно выбрать, кто выбран и переключение */
export function usePeoplePicker({
  projectId,
  value,
  onChange,
}: Pick<
  PeoplePickerProps,
  'projectId' | 'value' | 'onChange'
>): UsePeoplePickerResult {
  // наблюдатели - только если уже назначены
  const people = useProjectPeople(projectId, PeopleKind.Workers, value);
  const chosenUsers = people.filter((user) => value.includes(user.id));
  const hasChosen = chosenUsers.length > 0;
  const chosenNames = chosenUsers.map((user) => user.name).join(', ');
  const chosenLabel = hasChosen ? chosenNames : 'никто';
  // в подписи - все выбранные: на кнопке видны только два имени
  const triggerLabel = `Кто делает: ${chosenLabel}`;

  const handlePersonToggle = (userId: string): void => {
    if (value.includes(userId)) {
      onChange(value.filter((chosenId) => chosenId !== userId));

      return;
    }

    onChange([...value, userId]);
  };

  return {
    people,
    chosenUsers,
    hasChosen,
    triggerLabel,
    namesLabel: getNamesLabel(chosenUsers),
    handlePersonToggle,
  };
}
