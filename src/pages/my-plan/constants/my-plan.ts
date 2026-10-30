import { MyPlanView, MyPlanScope } from '../types/my-plan';

/** Дополнительный фильтр содержимого */
export const MY_PLAN_VIEWS = [
  { value: MyPlanView.All, label: 'Задачи и публикации' },
  { value: MyPlanView.Tasks, label: 'Задачи' },
  { value: MyPlanView.Content, label: 'Публикации' },
  { value: MyPlanView.Projects, label: 'Обзор проектов' },
];

/** Основной переключатель плана */
export const MY_PLAN_SCOPES = [
  { value: MyPlanScope.Mine, label: 'Мои задачи' },
  { value: MyPlanScope.All, label: 'Все задачи' },
];
