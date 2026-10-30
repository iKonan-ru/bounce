import { MyPlanView } from '../types/my-plan';

/** Переключение содержимого без дополнительных разделов меню */
export const MY_PLAN_VIEWS = [
  { value: MyPlanView.Tasks, label: 'Дела' },
  { value: MyPlanView.Content, label: 'Контент' },
  { value: MyPlanView.Projects, label: 'Проекты' },
];
