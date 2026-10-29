import type { User } from '@/entities/user';
import type { AvatarUser } from '@/shared/types';

/** Пропсы аватаров внахлёст */
export interface AvatarStackProps {
  users: readonly AvatarUser[];
  className?: string;
  /** Сколько аватаров видно: остальные - числом */
  maxCount?: number;
  /** Цвет обводки - под фон, на котором стоят аватары */
  ringClassName?: string;
}

/** Пропсы выбора исполнителей */
export interface PeoplePickerProps {
  projectId: string;
  /** Id выбранных людей */
  value: readonly string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  id?: string;
}

/** Состояние и действия выбора исполнителей */
export interface UsePeoplePickerResult {
  /** Кого можно выбрать */
  people: User[];
  chosenUsers: User[];
  hasChosen: boolean;
  /** Подпись кнопки для экранного диктора */
  triggerLabel: string;
  /** Имена на кнопке */
  namesLabel: string;
  handlePersonToggle: (userId: string) => void;
}

/** Пропсы человека в списке выбора */
export interface PersonOptionProps {
  user: User;
  /** Id выбранных людей */
  chosenIds: readonly string[];
  onToggle: (userId: string) => void;
}
