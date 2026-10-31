import type { Crumb } from '@/shared/types';
import { UserRole } from '../types/admin-users';

/** Логин: латиница в нижнем регистре, цифры, точка, дефис, подчёркивание; 3-32 знака */
export const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{2,31}$/;

/** Пробельные знаки: в логине их не бывает */
export const WHITESPACE_RE = /\s/g;

/** Предел длины логина */
export const USERNAME_MAX_LENGTH = 32;

/** Предел длины отображаемого имени */
export const NAME_MAX_LENGTH = 60;

/** Наименьшая длина пароля */
export const PASSWORD_MIN_LENGTH = 8;

/** Крошки страницы: назад в профиль */
export const ADMIN_CRUMBS: Crumb[] = [
  { label: 'Профиль', link: { to: '/me' } },
];

/** Названия ролей приложения */
export const USER_ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.Admin]: 'Администратор',
  [UserRole.Creator]: 'Создатель проектов',
  [UserRole.User]: 'Пользователь',
};

/** Варианты роли новой учетной записи */
export const USER_ROLE_OPTIONS = Object.values(UserRole).map((value) => ({
  value,
  label: USER_ROLE_LABEL[value],
}));
