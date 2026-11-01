import type { ProjectDirection } from '@/entities/project';
import { ContentDirection } from '@/shared/types';
import { MY_PLAN_DIRECTIONS } from '../constants/my-plan';
import { MyPlanScope, MyPlanView } from '../types/my-plan';

/** Сохраненный охват */
export function parseScope(value: string | null): MyPlanScope {
  return value === MyPlanScope.All ? MyPlanScope.All : MyPlanScope.Mine;
}

/** Сохраненный вид */
export function parseView(value: string | null): MyPlanView {
  return (
    Object.values(MyPlanView).find((item) => item === value) ?? MyPlanView.All
  );
}

/** Сохраненное направление */
export function parseDirection(value: string | null): ContentDirection {
  return (
    Object.values(ContentDirection).find((item) => item === value) ??
    ContentDirection.All
  );
}

/** Общие задачи доступны всегда, направления - только включенные в проекте */
export function getPlanDirectionOptions(
  directions: readonly ProjectDirection[]
) {
  return MY_PLAN_DIRECTIONS.filter(
    (option) =>
      option.value === ContentDirection.All ||
      option.value === ContentDirection.General ||
      directions.some((direction) => direction === option.value)
  );
}

/** Сохраненный идентификатор, проверяется по доступным данным */
export function parseId(value: string | null): string {
  return value ?? '';
}
