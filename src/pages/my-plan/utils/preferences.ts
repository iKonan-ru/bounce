import { ContentDirection } from '@/shared/types';
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

/** Сохраненный идентификатор, проверяется по доступным данным */
export function parseId(value: string | null): string {
  return value ?? '';
}
