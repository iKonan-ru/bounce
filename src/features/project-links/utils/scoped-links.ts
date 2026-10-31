import { ProjectDirection } from '@/entities/project';
import type { ProjectLink } from '@/entities/project';
import { getNewRecordId, moveItemById } from '@/shared/utils';

/** Разделяет общую ссылку, сохраняя идентификатор аккаунта видеопубликаций */
function splitSharedLinks(links: readonly ProjectLink[]): ProjectLink[] {
  return links.flatMap((link) => {
    if (link.directions.length < 2) {
      return [link];
    }

    return [
      { ...link, id: getNewRecordId(), directions: [ProjectDirection.music] },
      { ...link, directions: [ProjectDirection.video] },
    ];
  });
}

/** Правка затрагивает только выбранное направление */
export function saveScopedLink(
  links: readonly ProjectLink[],
  link: ProjectLink,
  before: ProjectLink | null,
  direction?: ProjectDirection
): ProjectLink[] {
  if (!before) {
    return [...links, link];
  }

  const previous = links.find((item) => item.id === before.id);

  if (!direction || !previous || previous.directions.length < 2) {
    return links.map((item) => (item.id === before.id ? link : item));
  }

  return links.flatMap((item) => {
    if (item.id !== before.id) {
      return [item];
    }

    const remaining = {
      ...item,
      directions: item.directions.filter((value) => value !== direction),
    };
    const changed = { ...link, directions: [direction] };

    if (direction === ProjectDirection.music) {
      changed.id = getNewRecordId();
    } else {
      remaining.id = getNewRecordId();
    }

    return [remaining, changed];
  });
}

/** Перестановка выбранного списка не удаляет и не переставляет другой */
export function reorderScopedLinks(
  links: readonly ProjectLink[],
  direction: ProjectDirection | undefined,
  from: string,
  to: string
): ProjectLink[] {
  if (!direction) {
    return moveItemById([...links], from, to);
  }

  const isolated = splitSharedLinks(links);
  const visible = isolated.filter((item) =>
    item.directions.includes(direction)
  );
  const originals = links.filter((item) => item.directions.includes(direction));
  const mappedFrom =
    visible[originals.findIndex((item) => item.id === from)]?.id;
  const mappedTo = visible[originals.findIndex((item) => item.id === to)]?.id;

  if (!mappedFrom || !mappedTo) {
    return [...links];
  }

  const reordered = moveItemById(visible, mappedFrom, mappedTo);
  let index = 0;

  return isolated.map((item) =>
    item.directions.includes(direction) ? (reordered[index++] ?? item) : item
  );
}

/** Из общей ссылки удаляется только выбранное направление */
export function deleteScopedLink(
  links: readonly ProjectLink[],
  id: string,
  direction?: ProjectDirection
): ProjectLink[] {
  return links.flatMap((item) => {
    if (item.id !== id) {
      return [item];
    }

    const directions = direction
      ? item.directions.filter((value) => value !== direction)
      : [];

    return directions.length > 0 ? [{ ...item, directions }] : [];
  });
}
