import { X } from 'lucide-react';
import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import type { TemplateSubstep } from '@/lib/model';
import { GROUP_ROWS } from '@/shared/constants';
import { Checkbox, SortableList } from '@/shared/ui';
import { getNewRecordId, cn, moveItemById } from '@/shared/utils';
import { AddRow } from './add-inline';
import { InlineTitle } from './inline-title';
import { MentionText } from './mentions';

/** Самое длинное название подэтапа */
const SUBSTEP_TITLE_MAX_LENGTH = 200;

/** Классы элемента, который на компьютере виден только при наведении на строку */
const HOVER_ONLY_CLASS =
  '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/sub:opacity-100 focus-visible:opacity-100';

/** Подэтап в редакторе: у этапа песни - с отметкой "сделано", в шаблоне этапов - без */
interface SubstepItem extends TemplateSubstep {
  done?: boolean;
}

/** Новый подэтап; с отметками - ещё не сделанный */
function createSubstep(title: string, isCheckable: boolean): SubstepItem {
  const id = getNewRecordId();

  if (!isCheckable) {
    return { id, title };
  }

  return { id, title, done: false };
}

/** Подэтапы, где у подэтапа с этим id изменены поля из patch */
function patchSubstep(
  items: readonly SubstepItem[],
  id: string,
  patch: Partial<SubstepItem>
): SubstepItem[] {
  return items.map((substep) => {
    if (substep.id !== id) {
      return substep;
    }

    return { ...substep, ...patch };
  });
}

/** Пропсы подэтапа только для просмотра */
interface ReadOnlySubstepProps {
  substep: SubstepItem;
  isCheckable: boolean;
}

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

/** Пропсы подэтапа в редакторе */
interface EditableSubstepProps {
  substep: SubstepItem;
  /** Ручка перетаскивания от списка */
  handle: ReactNode;
  idPrefix: string;
  isCheckable: boolean;
  projectId: string | undefined;
  onRename: (id: string, title: string) => void;
  onDoneChange: (id: string, isDone: boolean) => void;
  onDelete: (id: string) => void;
}

/** Что показать у подэтапа в редакторе и его обработчики */
interface UseEditableSubstepResult {
  checkboxId: string;
  isDone: boolean;
  titleClassName: string;
  renameLabel: string;
  deleteLabel: string;
  deleteClassName: string;
  onTitleSave: (title: string) => void;
  onCheckedChange: (state: CheckboxPrimitive.CheckedState) => void;
  onDeleteClick: () => void;
}

/** Логика подэтапа в редакторе: подписи, классы и правки */
function useEditableSubstep({
  substep,
  idPrefix,
  isCheckable,
  onRename,
  onDoneChange,
  onDelete,
}: Omit<
  EditableSubstepProps,
  'handle' | 'projectId'
>): UseEditableSubstepResult {
  const titleClassName = cn('min-w-0 flex-1 py-1 transition-colors', {
    'pl-1': !isCheckable,
    'text-dim line-through': substep.done,
  });
  const deleteClassName = cn(
    'group/x flex size-9 shrink-0 items-center justify-center text-dim/70 transition-opacity',
    HOVER_ONLY_CLASS
  );
  const onTitleSave = (title: string): void => {
    onRename(substep.id, title);
  };
  const onCheckedChange = (state: CheckboxPrimitive.CheckedState): void => {
    onDoneChange(substep.id, state === true);
  };
  const onDeleteClick = (): void => {
    onDelete(substep.id);
  };

  return {
    checkboxId: `${idPrefix}-${substep.id}`,
    isDone: substep.done === true,
    titleClassName,
    renameLabel: `Переименовать "${substep.title}"`,
    deleteLabel: `Удалить "${substep.title}"`,
    deleteClassName,
    onTitleSave,
    onCheckedChange,
    onDeleteClick,
  };
}

/** Подэтап в редакторе: ручка, отметка, название с правкой по нажатию и удаление */
function EditableSubstep({
  substep,
  handle,
  idPrefix,
  isCheckable,
  projectId,
  onRename,
  onDoneChange,
  onDelete,
}: EditableSubstepProps): ReactNode {
  const {
    checkboxId,
    isDone,
    titleClassName,
    renameLabel,
    deleteLabel,
    deleteClassName,
    onTitleSave,
    onCheckedChange,
    onDeleteClick,
  } = useEditableSubstep({
    substep,
    idPrefix,
    isCheckable,
    onRename,
    onDoneChange,
    onDelete,
  });

  return (
    <div className="group/sub flex min-h-12 items-center gap-1 pr-2 pl-1 md:min-h-10">
      {handle}
      {isCheckable && (
        <label
          htmlFor={checkboxId}
          className="-ml-1 flex size-10 shrink-0 cursor-pointer items-center justify-center md:size-8"
        >
          <Checkbox
            id={checkboxId}
            aria-label={substep.title}
            className="size-5 rounded-full md:size-[1.125rem]"
            checked={isDone}
            onCheckedChange={onCheckedChange}
          />
        </label>
      )}
      <div className={titleClassName}>
        <InlineTitle
          value={substep.title}
          label={renameLabel}
          maxLength={SUBSTEP_TITLE_MAX_LENGTH}
          showPencil={false}
          mentionProjectId={projectId}
          onSave={onTitleSave}
        />
      </div>
      <button
        type="button"
        aria-label={deleteLabel}
        onClick={onDeleteClick}
        className={deleteClassName}
      >
        <span className="flex size-6 items-center justify-center rounded-md transition-colors group-hover/x:bg-groove group-hover/x:text-ink">
          <X className="size-4" />
        </span>
      </button>
    </div>
  );
}

/** Пропсы редактора подэтапов */
interface SubstepsEditorProps<Item extends SubstepItem> {
  /** Проект - для упоминаний людей через @ */
  projectId?: string | undefined;
  /** Начало id полей: свои у каждого редактора на странице */
  idPrefix: string;
  items: readonly Item[];
  onChange: (items: SubstepItem[]) => void;
  /** С отметкой "сделано" (у этапа песни) */
  isCheckable: boolean;
  /** Только показать: без отметок, перетаскивания и правки */
  readOnly?: boolean;
}

/** Обработчики редактора подэтапов */
interface UseSubstepsEditorResult<Item extends SubstepItem> {
  addRowId: string;
  handleClassName: string;
  renderSubstep: (substep: Item, handle: ReactNode) => ReactNode;
  onReorder: (fromId: string, toId: string) => void;
  onSubstepAdd: (title: string) => void;
}

/** Логика редактора подэтапов: порядок, переименование, отметки, удаление и добавление */
function useSubstepsEditor<Item extends SubstepItem>({
  projectId,
  idPrefix,
  items,
  onChange,
  isCheckable,
}: SubstepsEditorProps<Item>): UseSubstepsEditorResult<Item> {
  const onReorder = (fromId: string, toId: string): void => {
    onChange(moveItemById(items, fromId, toId));
  };
  const onSubstepRename = (id: string, title: string): void => {
    onChange(patchSubstep(items, id, { title }));
  };
  const onSubstepDoneChange = (id: string, isDone: boolean): void => {
    onChange(patchSubstep(items, id, { done: isDone }));
  };
  const onSubstepDelete = (id: string): void => {
    onChange(items.filter((substep) => substep.id !== id));
  };
  const onSubstepAdd = (title: string): void => {
    onChange([...items, createSubstep(title, isCheckable)]);
  };
  const renderSubstep = (substep: Item, handle: ReactNode): ReactNode => (
    <EditableSubstep
      substep={substep}
      handle={handle}
      idPrefix={idPrefix}
      isCheckable={isCheckable}
      projectId={projectId}
      onRename={onSubstepRename}
      onDoneChange={onSubstepDoneChange}
      onDelete={onSubstepDelete}
    />
  );

  return {
    addRowId: `${idPrefix}-new`,
    handleClassName: cn('h-10 w-6', HOVER_ONLY_CLASS),
    renderSubstep,
    onReorder,
    onSubstepAdd,
  };
}

/** Пропсы подэтапов только для просмотра */
interface ReadOnlySubstepsProps {
  items: readonly SubstepItem[];
  isCheckable: boolean;
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
