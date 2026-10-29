import type { SongStage, SongWithStages } from '@/entities/song';
import type { Task } from '@/entities/task';
import type { Crumb, PlanGroup } from '@/shared/types';
import type { PlanItem, PlanItemKind } from '@/widgets/plan';

/** Чьи пункты показать */
export enum PlanScope {
  /** Все пункты */
  All = 'all',
  /** Только те, где я среди исполнителей */
  Mine = 'mine',
}

/** Что показать в плане */
export enum PlanView {
  /** Дела: этапы и задачи */
  Tasks = 'tasks',
  /** Контент-план: публикации */
  Content = 'content',
}

/** Вариант переключателя */
export interface ChoiceOption<Value extends string> {
  value: Value;
  label: string;
}

/** Открытый пункт плана: задача или этап - в окне поверх плана */
export interface OpenedItem {
  kind: PlanItemKind;
  id: string;
}

/** Открытый этап вместе с его песней */
export interface OpenedStage {
  stage: SongStage;
  song: SongWithStages;
}

/** Пропсы строки выполненной задачи */
export interface DoneTaskRowProps {
  task: Task;
  projectId: string;
  canWork: boolean;
  /** Открыть задачу по id */
  onOpen: (id: string) => void;
}

/** Пропсы поля новой задачи */
export interface PlanComposerProps {
  projectId: string;
  meId: string | undefined;
  canWork: boolean;
}

/** Состояние и данные страницы плана */
export interface UsePlanPageResult {
  projectId: string;
  crumbs: Crumb[];
  meId: string | undefined;
  canWork: boolean;
  scope: PlanScope;
  setScope: (scope: PlanScope) => void;
  isMine: boolean;
  view: PlanView;
  setView: (view: PlanView) => void;
  /** Исполнитель для фильтра "Мои"; undefined - все */
  mineId: string | undefined;
  groups: PlanGroup<PlanItem>[];
  doneTasks: Task[];
  isLoading: boolean;
  isEmpty: boolean;
  openedTask: Task | undefined;
  openedStage: OpenedStage | undefined;
  onItemOpen: (kind: PlanItemKind, id: string) => void;
  onTaskOpen: (id: string) => void;
  onDialogOpenChange: (isOpen: boolean) => void;
}
