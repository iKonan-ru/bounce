import type { ReactNode } from 'react';
import { projectQuery, useAccess } from '@/entities/project';
import { useQuery } from '@tanstack/react-query';
import { useProjectLinksEditor } from '../hooks/use-project-links-editor';
import type {
  AddProjectLinkProps,
  ProjectLinksEditorProps,
} from '../types/project-links';
import { AddLinkButton } from './add-link-button';
import { LinkDialog } from './link-dialog';

/** Добавляет площадку, не уводя пользователя из публикаций */
export function AddProjectLink({
  projectId,
  direction,
}: AddProjectLinkProps): ReactNode {
  const project = useQuery(projectQuery(projectId));
  const access = useAccess(projectId);

  if (
    !project.data ||
    !access.canManage ||
    !project.data.directions.includes(direction)
  ) {
    return null;
  }

  return (
    <AddLink
      project={project.data}
      isEditable={access.canManage}
      direction={direction}
    />
  );
}

/** Форма живет только пока доступно управление ссылками проекта */
function AddLink({
  project,
  isEditable,
  direction,
}: ProjectLinksEditorProps &
  Pick<AddProjectLinkProps, 'direction'>): ReactNode {
  const state = useProjectLinksEditor({ project, isEditable });

  return (
    <>
      <AddLinkButton label="Добавить площадку" onClick={state.onAddClick} />
      <LinkDialog
        isOpen={state.isDialogOpen}
        link={null}
        links={project.links ?? []}
        directions={project.directions}
        initialDirection={direction}
        isSaving={state.isSaving}
        onClose={state.onDialogClose}
        onSave={state.onLinkSave}
        onDelete={state.onLinkDelete}
      />
    </>
  );
}
