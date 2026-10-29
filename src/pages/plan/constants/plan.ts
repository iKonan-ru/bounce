import type { ChoiceOption } from '../types/plan';
import { PlanView, PlanScope } from '../types/plan';

/** Ключ хранилища: что показать в плане */
export const VIEW_STORAGE_KEY = 'bounce.plan.view';

/** Варианты переключателя "Что показать" */
export const VIEW_OPTIONS: readonly ChoiceOption<PlanView>[] = [
  { value: PlanView.Tasks, label: 'Дела' },
  { value: PlanView.Content, label: 'Контент' },
];

/** Ключ хранилища: чьи пункты показать */
export const SCOPE_STORAGE_KEY = 'bounce.plan.who';

/** Варианты переключателя "Чьи задачи" */
export const SCOPE_OPTIONS: readonly ChoiceOption<PlanScope>[] = [
  { value: PlanScope.All, label: 'Все' },
  { value: PlanScope.Mine, label: 'Мои' },
];
