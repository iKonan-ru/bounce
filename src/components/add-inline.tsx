import { Plus } from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMentions } from '@/hooks/use-mentions';
import { PeopleKind, useProjectPeople } from '@/lib/people';
import { cn } from '@/lib/utils';

/** Самое длинное название по умолчанию */
const DEFAULT_TITLE_MAX_LENGTH = 120;

/** Клавиша, которая сворачивает поле */
const CLOSE_KEY = 'Escape';

/** Пропсы строки "+ Добавить ..." */
interface AddRowProps {
  id: string;
  label: string;
  onAdd: (title: string) => Promise<unknown> | void;
  isBusy?: boolean | undefined;
  maxLength?: number;
  /** Упоминания людей этого проекта через @ */
  mentionProjectId?: string | undefined;
  className?: string;
}

/** Состояние и обработчики строки "+ Добавить ..." */
interface UseAddRowResult {
  /** Строка развёрнута в поле */
  isOpen: boolean;
  title: string;
  inputRef: RefObject<HTMLInputElement | null>;
  isAddDisabled: boolean;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onOpenClick: () => void;
  onFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTitleSelect: () => void;
  onTitleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onTitleBlur: () => void;
}

/** Логика строки "+ Добавить ...": раскрытие, поле с упоминаниями и добавление */
function useAddRow({
  onAdd,
  isBusy,
  mentionProjectId,
}: Pick<
  AddRowProps,
  'onAdd' | 'isBusy' | 'mentionProjectId'
>): UseAddRowResult {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const people = useProjectPeople(mentionProjectId, PeopleKind.Active);
  const mentions = useMentions({
    ref: inputRef,
    value: title,
    setValue: setTitle,
    people,
  });
  const hasTitle = title.trim() !== '';
  const isAddDisabled = !hasTitle || isBusy === true;

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const canAdd = trimmedTitle !== '' && !isBusy;

    if (!canAdd) {
      return;
    }

    try {
      await onAdd(trimmedTitle);
      setTitle('');
    } catch (error) {
      // сообщение об ошибке показывает вызывающий; текст остаётся в поле
      console.error(error);
    }
  };
  const onFormSubmit = (event: FormEvent<HTMLFormElement>): void => {
    void handleSubmit(event);
  };
  const onOpenClick = (): void => {
    setIsOpen(true);
  };
  const onTitleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setTitle(event.target.value);
  };
  const onTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (mentions.onKeyDown(event)) {
      return;
    }

    if (event.key === CLOSE_KEY) {
      setTitle('');
      setIsOpen(false);
    }
  };
  const onTitleBlur = (): void => {
    if (!hasTitle) {
      setIsOpen(false);
    }
  };

  return {
    isOpen,
    title,
    inputRef,
    isAddDisabled,
    mentionsMenu: mentions.menu,
    onOpenClick,
    onFormSubmit,
    onTitleChange,
    onTitleSelect: mentions.sync,
    onTitleKeyDown,
    onTitleBlur,
  };
}

/**
 * Строка "+ Добавить ..." в конце списка: по нажатию превращается в поле (как в Things и Linear)
 *
 * Enter - добавить и продолжить, Escape или пустое поле при уходе - свернуть
 */
export function AddRow({
  id,
  label,
  onAdd,
  isBusy,
  maxLength = DEFAULT_TITLE_MAX_LENGTH,
  mentionProjectId,
  className,
}: AddRowProps): ReactNode {
  const {
    isOpen,
    title,
    inputRef,
    isAddDisabled,
    mentionsMenu,
    onOpenClick,
    onFormSubmit,
    onTitleChange,
    onTitleSelect,
    onTitleKeyDown,
    onTitleBlur,
  } = useAddRow({ onAdd, isBusy, mentionProjectId });

  if (!isOpen) {
    const openButtonClassName = cn(
      'flex min-h-12 w-full items-center gap-3 px-4 text-left text-dim transition-colors hover:bg-groove/40 hover:text-ink md:min-h-10',
      className
    );

    return (
      <button
        type="button"
        onClick={onOpenClick}
        className={openButtonClassName}
      >
        <Plus className="size-4" />
        {label}
      </button>
    );
  }

  const formClassName = cn('flex items-center gap-2 px-2 py-1.5', className);

  return (
    <form onSubmit={onFormSubmit} className={formClassName}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        ref={inputRef}
        id={id}
        autoFocus
        placeholder={label}
        maxLength={maxLength}
        value={title}
        onChange={onTitleChange}
        onSelect={onTitleSelect}
        onKeyDown={onTitleKeyDown}
        onBlur={onTitleBlur}
        className="h-9 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      {mentionsMenu}
      <Button type="submit" size="sm" className="h-8" disabled={isAddDisabled}>
        Добавить
      </Button>
    </form>
  );
}
