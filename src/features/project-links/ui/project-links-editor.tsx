import type { ReactNode } from 'react';
import { GROUP_ROWS } from '@/shared/constants';
import { SortableList } from '@/shared/ui';
import { useProjectLinksEditor } from '../hooks/use-project-links-editor';
import type {
  ProjectLinksEditorProps,
  SortableLink,
} from '../types/project-links';
import { AddLinkButton } from './add-link-button';
import { LinkDialog } from './link-dialog';
import { LinkRow } from './link-row';

/**
 * Ссылки в настройках: только добавленные - название и кнопка перехода
 *
 * Порядок меняется перетаскиванием (так же они идут на странице проекта); сам адрес виден и
 * правится в окне, где сервис узнаётся по вставленной ссылке сам. У каждой ссылки свое
 * название; на одной площадке может быть несколько аккаунтов
 */
export function ProjectLinksEditor({
  project,
  isEditable,
  direction,
}: ProjectLinksEditorProps): ReactNode {
  const {
    sortableLinks,
    canReorder,
    showEmptyNote,
    isDialogOpen,
    editedLink,
    isSaving,
    onLinkEdit,
    onAddClick,
    onDialogClose,
    onLinkSave,
    onLinkDelete,
    onLinksReorder,
  } = useProjectLinksEditor({
    project,
    isEditable,
    ...(direction ? { direction } : {}),
  });

  const renderSortableLink = (
    sortableLink: SortableLink,
    handle: ReactNode
  ): ReactNode => (
    <LinkRow
      link={sortableLink.link}
      handle={handle}
      isEditable={isEditable}
      onEdit={onLinkEdit}
    />
  );

  return (
    <>
      <div className={GROUP_ROWS}>
        {canReorder ? (
          <SortableList
            items={sortableLinks}
            onReorder={onLinksReorder}
            className="divide-y divide-border/70 dark:divide-border/50"
            handleClassName="-mr-1 h-12 w-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:opacity-100"
          >
            {renderSortableLink}
          </SortableList>
        ) : (
          sortableLinks.map((sortableLink) => (
            <div key={sortableLink.id}>
              <LinkRow
                link={sortableLink.link}
                handle={null}
                isEditable={isEditable}
                onEdit={onLinkEdit}
              />
            </div>
          ))
        )}
        {showEmptyNote && (
          <p className="px-4 py-3 text-sm text-dim">Ссылок пока нет</p>
        )}
        {isEditable && (
          <AddLinkButton label="Добавить ссылку" onClick={onAddClick} />
        )}
      </div>
      <LinkDialog
        isOpen={isDialogOpen}
        link={
          editedLink && direction
            ? { ...editedLink, directions: [direction] }
            : editedLink
        }
        links={project.links ?? []}
        directions={direction ? [direction] : project.directions}
        initialDirection={direction}
        isSaving={isSaving}
        onClose={onDialogClose}
        onSave={onLinkSave}
        onDelete={onLinkDelete}
      />
    </>
  );
}
