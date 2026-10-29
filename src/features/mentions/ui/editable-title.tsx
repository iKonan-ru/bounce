import type { ReactNode } from 'react';
import { MentionText } from '@/entities/user';
import { TITLE_MAX_LENGTH } from '../constants/editable-title';
import { useEditableTitle } from '../hooks/use-editable-title';
import type { EditableTitleProps } from '../types/editable-title';

/**
 * Название в шапке окна задачи или публикации: текстом (упоминания - именами), по нажатию -
 * поле с упоминаниями людей проекта; Enter или уход из поля - сохранить
 *
 * Пока поле правят, правка соавтора набранное не затирает (lib/draft.ts); если ничего не
 * поменяли или стёрли всё, старое не отправляется
 */
export function EditableTitle({
  id,
  label,
  value,
  projectId,
  disabled,
  onCommit,
}: EditableTitleProps): ReactNode {
  const {
    title,
    isEditing,
    titleRef,
    mentionsMenu,
    onTitleClick,
    onTitleChange,
    onTitleSelect,
    onTitleFocus,
    onTitleBlur,
    onTitleKeyDown,
  } = useEditableTitle({ value, projectId, onCommit });

  return (
    <>
      {!isEditing && (
        <button
          type="button"
          disabled={disabled}
          onClick={onTitleClick}
          className="min-w-0 flex-1 cursor-text rounded-lg px-1.5 text-left text-lg leading-8 font-medium text-pretty transition-colors hover:bg-groove/40 disabled:cursor-default disabled:hover:bg-transparent"
        >
          <MentionText text={value} />
        </button>
      )}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        ref={titleRef}
        id={id}
        rows={1}
        maxLength={TITLE_MAX_LENGTH}
        hidden={!isEditing}
        disabled={disabled}
        value={title}
        onChange={onTitleChange}
        onSelect={onTitleSelect}
        onFocus={onTitleFocus}
        onBlur={onTitleBlur}
        onKeyDown={onTitleKeyDown}
        className="field-sizing-content min-w-0 flex-1 resize-none rounded-lg bg-transparent px-1.5 py-0 text-left text-lg leading-8 font-medium outline-none transition-colors hover:bg-groove/40 focus:bg-groove/50 disabled:opacity-100 disabled:hover:bg-transparent"
      />
      {mentionsMenu}
    </>
  );
}
