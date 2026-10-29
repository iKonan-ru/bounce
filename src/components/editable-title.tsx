import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useRef,
  useState,
} from 'react';
import { MentionText, useMentions } from '@/components/mentions';
import { useDraft } from '@/lib/draft';
import { PeopleKind, useProjectPeople } from '@/lib/people';

/** Клавиша, которой сохраняют название */
const ENTER_KEY = 'Enter';

/** Самое длинное название */
const TITLE_MAX_LENGTH = 300;

/** Пропсы названия в шапке окна */
interface EditableTitleProps {
  id: string;
  /** Подпись поля для экранного диктора */
  label: string;
  /** Название с сервера */
  value: string;
  projectId: string;
  disabled: boolean;
  /** Новое название без пробелов по краям */
  onCommit: (title: string) => void;
}

/** Состояние и действия названия в шапке окна */
interface UseEditableTitleResult {
  /** Набранное в поле */
  title: string;
  isEditing: boolean;
  titleRef: RefObject<HTMLTextAreaElement | null>;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onTitleClick: () => void;
  onTitleChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTitleSelect: () => void;
  onTitleFocus: () => void;
  onTitleBlur: () => void;
  onTitleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

/** Название в шапке окна: черновик, упоминания и сохранение при уходе из поля */
function useEditableTitle({
  value,
  projectId,
  onCommit,
}: Pick<
  EditableTitleProps,
  'value' | 'projectId' | 'onCommit'
>): UseEditableTitleResult {
  const { draft: title, setDraft: setTitle, start, finish } = useDraft(value);
  const people = useProjectPeople(projectId, PeopleKind.Active);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const mentions = useMentions({
    ref: titleRef,
    value: title,
    setValue: setTitle,
    people,
  });

  const onTitleBlur = (): void => {
    setIsEditing(false);
    const isChanged = finish();
    const trimmedTitle = title.trim();
    const shouldRestore = [
      !isChanged,
      !trimmedTitle,
      trimmedTitle === value,
    ].some(Boolean);

    if (shouldRestore) {
      setTitle(value);

      return;
    }

    onCommit(trimmedTitle);
  };

  const focusTitle = (): void => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  };

  const onTitleClick = (): void => {
    setIsEditing(true);
    requestAnimationFrame(focusTitle);
  };

  const onTitleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setTitle(event.target.value);
  };

  const onTitleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (mentions.onKeyDown(event)) {
      return;
    }

    if (event.key === ENTER_KEY) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  return {
    title,
    isEditing,
    titleRef,
    mentionsMenu: mentions.menu,
    onTitleClick,
    onTitleChange,
    onTitleSelect: mentions.sync,
    onTitleFocus: start,
    onTitleBlur,
    onTitleKeyDown,
  };
}

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
