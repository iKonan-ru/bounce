import type { ReactNode } from 'react';
import { MentionText } from '@/entities/user';
import { AddRow } from '@/features/mentions';
import { GROUP_ROWS } from '@/shared/constants';
import { Checkbox, SortableList } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useSubstepsEditor } from '../hooks/use-substeps-editor';
import type {
  ReadOnlySubstepProps,
  ReadOnlySubstepsProps,
  SubstepItem,
  SubstepsEditorProps,
} from '../types/substeps';

/** Подэтап только для просмотра: отметка и текст без правки */
function ReadOnlySubstep({
  substep,
  isCheckable,
}: ReadOnlySubstepProps): ReactNode {
  const isDone = substep.done === true;
  const titleClassName = cn('min-w-0 text-pretty', {
    'text-dim line-through': substep.done,
  });

  return (
    <li className="flex min-h-12 items-center gap-3 px-4 md:min-h-10">
      {isCheckable && (
        <Checkbox
          disabled
          aria-label={substep.title}
          className="size-5 rounded-full disabled:opacity-100 md:size-[1.125rem]"
          checked={isDone}
        />
      )}
      <span className={titleClassName}>
        <MentionText text={substep.title} />
      </span>
    </li>
  );
}

/** Подэтапы только для просмотра: без отметок, перетаскивания и правки */
function ReadOnlySubsteps({
  items,
  isCheckable,
}: ReadOnlySubstepsProps): ReactNode {
  const isEmpty = items.length === 0;

  return (
    <ul className={GROUP_ROWS}>
      {items.map((substep) => (
        <ReadOnlySubstep
          key={substep.id}
          substep={substep}
          isCheckable={isCheckable}
        />
      ))}
      {isEmpty && <li className="px-4 py-3 text-sm text-dim">Подэтапов нет</li>}
    </ul>
  );
}

/** Подэтапы, которые можно править */
function EditableSubsteps<Item extends SubstepItem>(
  props: SubstepsEditorProps<Item>
): ReactNode {
  const { projectId, items } = props;
  const { addRowId, handleClassName, renderSubstep, onReorder, onSubstepAdd } =
    useSubstepsEditor(props);
  const hasItems = items.length > 0;

  return (
    <div className={GROUP_ROWS}>
      {hasItems && (
        <SortableList
          items={items}
          onReorder={onReorder}
          className="divide-y divide-border/70 dark:divide-border/50"
          handleClassName={handleClassName}
        >
          {renderSubstep}
        </SortableList>
      )}
      <AddRow
        id={addRowId}
        mentionProjectId={projectId}
        label="Добавить подэтап"
        onAdd={onSubstepAdd}
      />
    </div>
  );
}

/**
 * Подэтапы - чек-лист: отметка "сделано" (у этапа песни), переименование по нажатию на текст,
 * перетаскивание, удаление, добавление
 *
 * Ручка и крестик на компьютере видны при наведении, на телефоне - всегда, но тихие
 */
export function SubstepsEditor<Item extends SubstepItem>(
  props: SubstepsEditorProps<Item>
): ReactNode {
  if (props.readOnly) {
    return (
      <ReadOnlySubsteps items={props.items} isCheckable={props.isCheckable} />
    );
  }

  return <EditableSubsteps {...props} />;
}
