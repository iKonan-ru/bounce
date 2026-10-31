import { CONTENT_DIRECTION_OPTIONS } from '@/shared/constants';
import { ContentDirection } from '@/shared/types';
import { MyPlanView, MyPlanScope } from '../types/my-plan';

/** Дополнительный фильтр содержимого */
export const MY_PLAN_VIEWS = [
  { value: MyPlanView.All, label: 'Все' },
  { value: MyPlanView.Tasks, label: 'Задачи' },
  { value: MyPlanView.Content, label: 'Публикации' },
];

/** Основной переключатель плана */
export const MY_PLAN_SCOPES = [
  { value: MyPlanScope.Mine, label: 'Мои задачи' },
  { value: MyPlanScope.All, label: 'Все задачи' },
];

/** Короткие значения в подписанных строках фильтров */
export const MY_PLAN_DIRECTIONS = CONTENT_DIRECTION_OPTIONS.map((option) => ({
  ...option,
  label: option.value === ContentDirection.All ? 'Все' : option.label,
}));
