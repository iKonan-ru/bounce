import { Pencil } from 'lucide-react';
import {
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useRef,
  useState,
} from 'react';
import { MentionText } from '@/components/mentions';
import { useMentions } from '@/hooks/use-mentions';
import { PeopleKind, useProjectPeople } from '@/lib/people';
import { cn } from '@/lib/utils';

/** Самый длинный текст по умолчанию */
const DEFAULT_MAX_LENGTH = 120;

/** Клавиша, которой отменяют правку */
const ESCAPE_KEY = 'Escape';

/** Пропсы текста, который правится на месте */
interface InlineTitleProps {
  value: string;
  /** Новый текст без пробелов по краям */
  onSave: (value: string) => void;
  /** Подпись поля и карандаша для экранного диктора */
  label: string;
  maxLength?: number;
  /** Карандаш рядом с текстом; без него правка - только по нажатию на текст */
  showPencil?: boolean;
  /** Упоминания людей этого проекта через @ (в поле - список, в тексте - имена) */
  mentionProjectId?: string | undefined;
  className?: string;
}

/** Состояние и действия текста, который правится на месте */
interface UseInlineTitleResult {
  isEditing: boolean;
  /** Набранное в поле */
  draft: string;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onEditClick: () => void;
  onSubmit: (event: FormEvent) => void;
  onInputFocus: (event: FocusEvent<HTMLInputElement>) => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInputSelect: () => void;
  onInputBlur: () => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/** Правка текста на месте: черновик, упоминания, сохранение и отмена */
function useInlineTitle({
  value,
  onSave,
  mentionProjectId,
}: Pick<
  InlineTitleProps,
  'value' | 'onSave' | 'mentionProjectId'
>): UseInlineTitleResult {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  // Escape: поле исчезает, и браузер шлёт ему blur - без этой отметки blur сохранил бы черновик
  const wasCancelled = useRef(false);
  const people = useProjectPeople(mentionProjectId, PeopleKind.Active);
  const mentions = useMentions({
    ref: inputRef,
    value: draft,
    setValue: setDraft,
    people,
  });

  const onEditClick = (): void => {
    wasCancelled.current = false;
    setDraft(value);
    setIsEditing(true);
  };

  const handleCommit = (): void => {
    if (wasCancelled.current) {
      return;
    }

    const trimmedDraft = draft.trim();
    const isChanged = trimmedDraft !== '' && trimmedDraft !== value;

    if (isChanged) {
      onSave(trimmedDraft);
    }

    setIsEditing(false);
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    handleCommit();
  };

  const onInputFocus = (event: FocusEvent<HTMLInputElement>): void => {
    event.currentTarget.select();
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setDraft(event.target.value);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (mentions.onKeyDown(event)) {
      return;
    }

    if (event.key === ESCAPE_KEY) {
      wasCancelled.current = true;
      setIsEditing(false);
    }
  };

  return {
    isEditing,
    draft,
    inputRef,
    mentionsMenu: mentions.menu,
    onEditClick,
    onSubmit,
    onInputFocus,
    onInputChange,
    onInputSelect: mentions.sync,
    onInputBlur: handleCommit,
    onInputKeyDown,
  };
}

/**
 * Текст, который правится на месте: нажатие на текст или карандаш - поле, Enter или уход из
 * поля - сохранить, Escape - отменить (как названия задач в Linear и Things)
 */
export function InlineTitle({
  value,
  onSave,
  label,
  maxLength = DEFAULT_MAX_LENGTH,
  showPencil = true,
  mentionProjectId,
  className,
}: InlineTitleProps): ReactNode {
  const {
    isEditing,
    draft,
    inputRef,
    mentionsMenu,
    onEditClick,
    onSubmit,
    onInputFocus,
    onInputChange,
    onInputSelect,
    onInputBlur,
    onInputKeyDown,
  } = useInlineTitle({ value, onSave, mentionProjectId });
  const textClassName = cn('inline', className);
  const formClassName = cn('animate-in fade-in-0 duration-150', className);

  if (!isEditing) {
    return (
      <span className={textClassName}>
        <button
          type="button"
          title={label}
          onClick={onEditClick}
          className="-mx-1.5 max-w-full cursor-text rounded-lg px-1.5 text-left text-pretty [text-decoration:inherit] transition-colors hover:bg-groove/60"
        >
          <MentionText text={value} />
        </button>
        {showPencil && (
          <button
            type="button"
            aria-label={label}
            onClick={onEditClick}
            className="ml-1 inline-flex size-8 -translate-y-0.5 items-center justify-center rounded-lg align-middle text-dim transition-colors hover:bg-groove hover:text-ink"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </span>
    );
  }

  return (
    <form onSubmit={onSubmit} className={formClassName}>
      <input
        ref={inputRef}
        aria-label={label}
        // autoFocus: поле появляется по нажатию на текст
        autoFocus
        maxLength={maxLength}
        value={draft}
        onFocus={onInputFocus}
        onChange={onInputChange}
        onSelect={onInputSelect}
        onBlur={onInputBlur}
        onKeyDown={onInputKeyDown}
        className="-mx-1.5 w-[calc(100%+0.75rem)] rounded-lg bg-groove/60 px-1.5 font-[inherit] text-[length:inherit] tracking-[inherit] outline-none ring-2 ring-ring/40"
      />
      {mentionsMenu}
    </form>
  );
}
