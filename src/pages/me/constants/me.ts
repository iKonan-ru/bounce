import { ThemeChoice } from '@/features/theme';
import { Collections } from '@/shared/api';
import type { Crumb, FileRecord } from '@/shared/types';
import type { ChoiceOption } from '../types/me';

/** Варианты темы */
export const THEME_OPTIONS: readonly ChoiceOption<ThemeChoice>[] = [
  { value: ThemeChoice.System, label: 'Как в системе' },
  { value: ThemeChoice.Light, label: 'Светлая' },
  { value: ThemeChoice.Dark, label: 'Тёмная' },
];

/** Строка-ссылка в группе "Управление" */
export const LINK_ROW_CLASS_NAME =
  'flex min-h-12 items-center gap-3 px-4 transition-colors hover:bg-groove/40 md:min-h-11';

/** Профиль - корень пути: хлебных крошек нет */
export const NO_CRUMBS: readonly Crumb[] = [];

/** Поле аватара в записи пользователя */
export const AVATAR_FIELD = 'avatar';

/** Уменьшенные копии аватара, которые нужны сразу после загрузки */
export const AVATAR_THUMBS: readonly string[] = ['96x96', '256x256'];

/** Запись-заглушка для загрузки аватара, пока нет входа */
export const EMPTY_USER_RECORD: FileRecord = {
  id: '',
  collectionId: '',
  collectionName: Collections.Users,
};

/** Самый короткий новый пароль */
export const MIN_PASSWORD_LENGTH = 8;
