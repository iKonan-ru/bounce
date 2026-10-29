import { useState } from 'react';
import { toast } from 'sonner';
import type { ProjectLink } from '@/entities/project';
import { getProjectLinks, OTHER_SERVICE } from '@/entities/service';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { moveItemById } from '@/shared/utils';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  ProjectLinksEditorProps,
  UseProjectLinksEditorResult,
  EditingLink,
  LinkSaver,
} from '../types/project-links';
import { EditTarget } from '../types/project-links';

/** Одна и та же ссылка: сервис, адрес и название совпадают */
function checkIsSameLink(first: ProjectLink, second: ProjectLink): boolean {
  const isSameService = first.service === second.service;
  const isSameUrl = first.url === second.url;
  const isSameName = (first.name ?? '') === (second.name ?? '');

  return [isSameService, isSameUrl, isSameName].every(Boolean);
}

/**
 * Место той же ссылки в списке: по значению, а не по объекту
 *
 * После перечитывания проекта (правка соавтора, возврат на вкладку) объекты в списке новые
 */
function getLinkIndex(all: readonly ProjectLink[], link: ProjectLink): number {
  return all.findIndex((candidate) => checkIsSameLink(candidate, link));
}

/** Список ссылок, правка, удаление и перестановка */
export function useProjectLinksEditor({
  project,
  isEditable,
}: ProjectLinksEditorProps): UseProjectLinksEditorResult {
  const client = useQueryClient();
  const [editing, setEditing] = useState<EditingLink>(null);
  const all = project.links ?? [];
  const links = getProjectLinks(project);

  const save = useMutation({
    mutationFn: (next: ProjectLink[]) =>
      getCollection(pb, Collections.Projects).update(project.id, {
        links: next,
      }),
    onSettled: () =>
      client.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: () => toast.error('Ссылка не сохранилась: проверьте соединение'),
  });

  // правка заменяет прежнюю запись; у сервиса из списка ссылка одна - старая уходит
  const onLinkSave: LinkSaver = (link, before) => {
    let editedIndex = -1;

    if (before) {
      editedIndex = getLinkIndex(all, before);
    }

    const isOtherLink = link.service === OTHER_SERVICE.id;
    const checkIsKept = (candidate: ProjectLink, index: number): boolean => {
      if (index === editedIndex) {
        return false;
      }

      const isDifferentService = candidate.service !== link.service;

      return isOtherLink || isDifferentService;
    };
    const next = all.filter(checkIsKept);
    // на место прежней: столько оставшихся ссылок, сколько стояло перед ней
    let insertIndex = next.length;

    if (editedIndex >= 0) {
      insertIndex = all.slice(0, editedIndex).filter(checkIsKept).length;
    }

    next.splice(insertIndex, 0, link);
    save.mutate(next);
  };
  const onLinkDelete = (link: ProjectLink): void => {
    const deletedIndex = getLinkIndex(all, link);

    if (deletedIndex >= 0) {
      save.mutate(all.filter((_, index) => index !== deletedIndex));
    }
  };

  // для перетаскивания: свой id у каждой ссылки, одинаковые "другие" различаются номером
  const sortableLinks = links.map((link, index) => ({
    id: `${index}:${link.service}:${link.url}`,
    link,
  }));
  const onLinksReorder = (from: string, to: string): void => {
    save.mutate(
      moveItemById(sortableLinks, from, to).map(
        (sortableLink) => sortableLink.link
      )
    );
  };
  const onLinkEdit = (link: ProjectLink): void => {
    setEditing(link);
  };
  const onAddClick = (): void => {
    setEditing(EditTarget.New);
  };
  const onDialogClose = (): void => {
    setEditing(null);
  };

  let editedLink: ProjectLink | null = null;

  if (editing !== EditTarget.New) {
    editedLink = editing;
  }

  const hasLinks = links.length > 0;
  const hasSortableLinks = sortableLinks.length > 0;
  const takenServices = links
    .map((link) => link.service)
    .filter((id) => id !== OTHER_SERVICE.id);

  return {
    links,
    sortableLinks,
    canReorder: isEditable && hasSortableLinks,
    showEmptyNote: !hasLinks && !isEditable,
    isDialogOpen: editing !== null,
    editedLink,
    takenServices,
    onLinkEdit,
    onAddClick,
    onDialogClose,
    onLinkSave,
    onLinkDelete,
    onLinksReorder,
  };
}
