import type { ChoiceOption } from '../types/plan';
import { PlanView } from '../types/plan';

/** Ключ хранилища: что показать в плане */
export const VIEW_STORAGE_KEY = 'bounce.plan.view';

/** Варианты переключателя "Что показать" */
export const VIEW_OPTIONS: readonly ChoiceOption<PlanView>[] = [
  { value: PlanView.Tasks, label: 'Дела' },
  { value: PlanView.Content, label: 'Контент' },
];

/** Ключ хранилища: чьи пункты показать */
export const SCOPE_STORAGE_KEY = 'bounce.plan.who';
