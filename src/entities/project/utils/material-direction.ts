import { readChoice, writeChoice } from '@/shared/utils';
import { ProjectDirection } from '../types/directions';
import type { Project } from '../types/project';

/** Доступное направление: сохраненный выбор, иначе музыка или видео */
export function getMaterialDirection(
  project: Pick<Project, 'directions'>,
  remembered: string | null
): ProjectDirection {
  if (
    (remembered === ProjectDirection.video ||
      remembered === ProjectDirection.other) &&
    project.directions.includes(remembered)
  ) {
    return remembered;
  }

  return (
    [
      ProjectDirection.music,
      ProjectDirection.video,
      ProjectDirection.other,
    ].find((direction) => project.directions.includes(direction)) ??
    ProjectDirection.music
  );
}

/** Выбор хранится отдельно для человека и проекта */
export function getRememberedDirection(
  userId: string,
  projectId: string
): string | null {
  return readChoice(
    `bounce.direction.${userId}.${projectId}`,
    (value) => value,
    null
  );
}

/** Запоминается только явно открытое направление */
export function rememberDirection(
  userId: string,
  projectId: string,
  direction: ProjectDirection
): void {
  writeChoice(`bounce.direction.${userId}.${projectId}`, direction);
}
