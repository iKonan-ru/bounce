import { useState } from 'react';
import { toast } from 'sonner';
import type { ProjectLink } from '@/entities/project';
import { getProjectLinks } from '@/entities/service';
import {
  getCollection,
  pb,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  ProjectLinksEditorProps,
  UseProjectLinksEditorResult,
  EditingLink,
  LinkSaver,
} from '../types/project-links';
import { EditTarget } from '../types/project-links';
import {
  saveScopedLink,
  deleteScopedLink,
  reorderScopedLinks,
} from '../utils/scoped-links';

/** Список ссылок, правка, удаление и перестановка */
export function useProjectLinksEditor({
  project,
  isEditable,
  direction,
}: ProjectLinksEditorProps): UseProjectLinksEditorResult {
  const client = useQueryClient();
  const [editing, setEditing] = useState<EditingLink>(null);
  const all = project.links ?? [];
  const links = getProjectLinks(project, direction);

  const save = useMutation({
    mutationFn: (next: ProjectLink[]) =>
      getCollection(pb, Collections.Projects).update(project.id, {
        links: next,
      }),
    onSettled: () =>
      client.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: (error) =>
      toast.error(getErrorText(error, 'Ссылка не сохранилась')),
  });

  const onLinkSave: LinkSaver = async (link, before) => {
    const next = saveScopedLink(all, link, before, direction);
    await save.mutateAsync(next);
  };
  const onLinkDelete = async (link: ProjectLink): Promise<void> => {
    await save.mutateAsync(deleteScopedLink(all, link.id, direction));
  };

  const sortableLinks = links.map((link) => ({ id: link.id, link }));
  const onLinksReorder = (from: string, to: string): void => {
    save.mutate(reorderScopedLinks(all, direction, from, to));
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

  return {
    links,
    sortableLinks,
    canReorder: isEditable && hasSortableLinks,
    showEmptyNote: !hasLinks && !isEditable,
    isDialogOpen: editing !== null,
    editedLink,
    isSaving: save.isPending,
    onLinkEdit,
    onAddClick,
    onDialogClose,
    onLinkSave,
    onLinkDelete,
    onLinksReorder,
  };
}
