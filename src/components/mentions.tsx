import { useQuery } from '@tanstack/react-query';
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '@/components/avatar';
import {
  getMatchingPeople,
  getMentionQuery,
  insertMention,
  type MentionPart,
  MentionPartKind,
  type MentionQuery,
  type Person,
  splitMentions,
} from '@/lib/mentions';
import type { User } from '@/lib/model';
import { usersQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

/** Поле ввода, в котором работают упоминания */
type MentionField = HTMLInputElement | HTMLTextAreaElement;

/** Окно, внутри которого рисуется список, если поле в окне */
const DIALOG_SELECTOR = '[data-slot="dialog-content"]';

/** Отступ списка от нижнего края поля, px */
const MENU_GAP_PX = 4;

/** Наименьший отступ списка от левого края окна или экрана, px */
const MENU_MIN_LEFT_PX = 8;

/** Место списка: в каком элементе он рисуется и где стоит */
interface MenuPlace {
  host: Element;
  style: CSSProperties;
}

/** Параметры хука упоминаний */
interface UseMentionsParams<T extends MentionField> {
  ref: RefObject<T | null>;
  /** Текст поля */
  value: string;
  setValue: (value: string) => void;
  /** Кого можно упомянуть */
  people: readonly User[];
}

/** Результат хука упоминаний */
interface UseMentionsResult<T extends MentionField> {
  /** Список подходящих людей в портале; null - списка нет */
  menu: ReactNode;
  /** Клавиши списка; true - нажатие обработано */
  onKeyDown: (event: KeyboardEvent<T>) => boolean;
  /** Сверить список с курсором в поле */
  sync: () => void;
}

/** Результат хука места списка */
interface UseMenuPlaceResult {
  /** Место списка; null - списка не видно */
  place: MenuPlace | null;
}

/** Пропсы строки списка упоминаний */
interface MentionOptionProps {
  person: Person;
  index: number;
  optionId: string;
  isActive: boolean;
  onActivate: (index: number) => void;
  onPick: (person: Person) => void;
}

/** Пропсы имени вместо логина */
interface MentionNameProps {
  username: string;
}

/** Пропсы текста с упоминаниями */
interface MentionTextProps {
  text: string;
}

/** Пропсы части текста с упоминаниями */
interface MentionPartViewProps {
  part: MentionPart;
}

/** Набираемое упоминание то же: то же начало и тот же запрос */
function checkIsSameQuery(first: MentionQuery | null, second: MentionQuery | null): boolean {
  const isSameStart = first?.start === second?.start;
  const isSameQuery = first?.query === second?.query;
  return isSameStart && isSameQuery;
}

/** Подходящие люди для набираемого упоминания; без упоминания - никого */
function getSuggestedPeople(people: readonly User[], query: MentionQuery | null): Person[] {
  if (!query) {
    return [];
  }
  return getMatchingPeople(people, query.query);
}

/** Место списка под полем, у левого края: в окне - внутри окна, иначе - в body */
function getMenuPlace(field: MentionField): MenuPlace {
  const fieldRect = field.getBoundingClientRect();
  const dialog = field.closest(DIALOG_SELECTOR);
  if (!dialog) {
    return {
      host: document.body,
      style: {
        position: 'fixed',
        top: fieldRect.bottom + MENU_GAP_PX,
        left: Math.max(MENU_MIN_LEFT_PX, fieldRect.left),
      },
    };
  }
  const dialogRect = dialog.getBoundingClientRect();
  return {
    host: dialog,
    style: {
      position: 'absolute',
      top: fieldRect.bottom - dialogRect.top + dialog.scrollTop + MENU_GAP_PX,
      left: Math.max(MENU_MIN_LEFT_PX, fieldRect.left - dialogRect.left),
    },
  };
}

/** Список в портале, когда он открыт и его место известно */
function getMenuPortal(list: ReactNode, place: MenuPlace | null, isOpen: boolean): ReactNode {
  if (!place) {
    return null;
  }
  if (!isOpen) {
    return null;
  }
  return createPortal(list, place.host);
}

/**
 * Для экранного диктора поле - выпадающий список (ARIA combobox): фокус остаётся в поле,
 * выбранный человек объявляется через aria-activedescendant
 *
 * Атрибуты ставятся здесь, а не в каждом поле с упоминаниями. Многострочное поле остаётся полем:
 * combobox бывает однострочным
 */
function useComboboxAttributes(
  ref: RefObject<MentionField | null>,
  isOpen: boolean,
  listId: string,
  activeOptionId: string,
): void {
  useEffect(() => {
    const field = ref.current;
    if (!field) {
      return;
    }
    if (field instanceof HTMLInputElement) {
      field.setAttribute('role', 'combobox');
      field.setAttribute('aria-expanded', String(isOpen));
    }
    field.setAttribute('aria-autocomplete', 'list');
    if (!isOpen) {
      field.removeAttribute('aria-controls');
      field.removeAttribute('aria-activedescendant');
      return;
    }
    field.setAttribute('aria-controls', listId);
    field.setAttribute('aria-activedescendant', activeOptionId);
  });
}

/** Место списка под полем; следует за полем при прокрутке и смене размера окна */
function useMenuPlace(ref: RefObject<MentionField | null>, isOpen: boolean): UseMenuPlaceResult {
  const [place, setPlace] = useState<MenuPlace | null>(null);
  useEffect(() => {
    const field = ref.current;
    if (!field) {
      setPlace(null);
      return;
    }
    if (!isOpen) {
      setPlace(null);
      return;
    }
    const updatePlace = (): void => {
      setPlace(getMenuPlace(field));
    };
    updatePlace();
    window.addEventListener('resize', updatePlace);
    window.addEventListener('scroll', updatePlace, true);
    return () => {
      window.removeEventListener('resize', updatePlace);
      window.removeEventListener('scroll', updatePlace, true);
    };
  }, [isOpen, ref]);
  return { place };
}

/** Строка списка упоминаний: аватар, имя и логин */
function MentionOption({
  person,
  index,
  optionId,
  isActive,
  onActivate,
  onPick,
}: MentionOptionProps): ReactNode {
  // нажатие не уводит фокус из поля
  const onOptionMouseDown = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
  };
  const onOptionMouseEnter = (): void => {
    onActivate(index);
  };
  const onOptionClick = (): void => {
    onPick(person);
  };
  const optionClassName = cn(
    'flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 text-left md:min-h-9',
    { 'bg-groove/70': isActive },
  );
  return (
    <button
      type="button"
      id={optionId}
      role="option"
      aria-selected={isActive}
      tabIndex={-1}
      onMouseDown={onOptionMouseDown}
      onMouseEnter={onOptionMouseEnter}
      onClick={onOptionClick}
      className={optionClassName}
    >
      <Avatar user={person} className="size-6 text-[0.625rem]" />
      <span className="min-w-0 flex-1 truncate">{person.name}</span>
      <span className="shrink-0 text-xs text-dim">@{person.username}</span>
    </button>
  );
}

/**
 * Упоминания в поле ввода: после "@" под полем - список подходящих людей; стрелки, Enter или Tab -
 * выбрать, Escape - закрыть. В поле вставляется @логин, при показе текста - имя
 *
 * Список рисуется в портале под полем: в окне - внутри окна (иначе нажатие на него закрыло бы
 * окно), иначе - в body; так его не обрезают блоки со скруглёнными краями
 */
export function useMentions<T extends MentionField>({
  ref,
  value,
  setValue,
  people,
}: UseMentionsParams<T>): UseMentionsResult<T> {
  const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [closedAt, setClosedAt] = useState<number | null>(null);

  // useCallback нужен для корректности: sync - зависимость эффекта ниже и эффектов в полях,
  // новая функция на каждой отрисовке перезапускала бы их
  const sync = useCallback((): void => {
    const field = ref.current;
    if (!field) {
      setMentionQuery(null);
      return;
    }
    if (document.activeElement !== field) {
      setMentionQuery(null);
      return;
    }
    const nextQuery = getMentionQuery(field.value, field.selectionStart ?? field.value.length);
    // закрытый Escape список не открывается снова, пока не начали новое упоминание
    const isClosedByEscape = nextQuery !== null && closedAt === nextQuery.start;
    if (isClosedByEscape) {
      setMentionQuery(null);
      return;
    }
    setMentionQuery((prev) => {
      if (checkIsSameQuery(prev, nextQuery)) {
        return prev;
      }
      return nextQuery;
    });
    setActiveIndex(0);
  }, [ref, closedAt]);

  // value меняется и когда текст вставили кнопками: сверяемся с курсором после отрисовки
  // biome-ignore lint/correctness/useExhaustiveDependencies: пересчёт - именно при смене текста
  useEffect(() => {
    sync();
  }, [value, sync]);

  const suggestedPeople = getSuggestedPeople(people, mentionQuery);
  const isOpen = mentionQuery !== null && suggestedPeople.length > 0;

  const listId = useId();
  const getOptionId = (index: number): string => `${listId}-${index}`;
  const activeOptionId = getOptionId(activeIndex);
  useComboboxAttributes(ref, isOpen, listId, activeOptionId);

  const { place } = useMenuPlace(ref, isOpen);

  const handlePersonPick = (person: Person): void => {
    const field = ref.current;
    if (!field) {
      return;
    }
    if (!mentionQuery) {
      return;
    }
    const caret = field.selectionStart ?? value.length;
    const next = insertMention(value, mentionQuery.start, caret, person.username);
    setValue(next.value);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(next.caret, next.caret);
    });
  };

  const onKeyDown = (event: KeyboardEvent<T>): boolean => {
    if (!isOpen) {
      return false;
    }
    const isArrowKey = event.key === 'ArrowDown' || event.key === 'ArrowUp';
    if (isArrowKey) {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const count = suggestedPeople.length;
      setActiveIndex((prev) => (prev + direction + count) % count);
      return true;
    }
    const isPickKey = event.key === 'Enter' || event.key === 'Tab';
    if (isPickKey) {
      const person = suggestedPeople[activeIndex];
      if (!person) {
        return false;
      }
      event.preventDefault();
      handlePersonPick(person);
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setClosedAt(mentionQuery?.start ?? null);
      setMentionQuery(null);
      return true;
    }
    return false;
  };

  const menuStyle = place?.style;
  const list = (
    <div
      id={listId}
      role="listbox"
      aria-label="Упомянуть"
      style={menuStyle}
      className="z-[70] w-64 max-w-[calc(100vw-2rem)] animate-in fade-in-0 zoom-in-95 rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100"
    >
      {suggestedPeople.map((person, index) => {
        const optionId = getOptionId(index);
        const isActive = index === activeIndex;
        return (
          <MentionOption
            key={person.id}
            person={person}
            index={index}
            optionId={optionId}
            isActive={isActive}
            onActivate={setActiveIndex}
            onPick={handlePersonPick}
          />
        );
      })}
    </div>
  );
  const menu = getMenuPortal(list, place, isOpen);

  return { menu, onKeyDown, sync };
}

/** Имя вместо @логина; кого нет среди пользователей - логин как есть */
export function MentionName({ username }: MentionNameProps): ReactNode {
  const users = useQuery(usersQuery);
  const user = users.data?.find((candidate) => candidate.username === username);
  const mentionLabel = `@${username}`;
  const hasUser = Boolean(user);
  const nameClassName = cn('rounded-md px-1 py-px font-medium whitespace-nowrap', {
    'bg-groove/80 text-ink': hasUser,
    'text-dim': !hasUser,
  });
  const displayName = user ? user.name : mentionLabel;
  return (
    <span title={mentionLabel} className={nameClassName}>
      {displayName}
    </span>
  );
}

/** Часть текста: упоминание показывается именем, остальное - как есть */
function MentionPartView({ part }: MentionPartViewProps): ReactNode {
  if (part.kind === MentionPartKind.Mention) {
    return <MentionName username={part.username} />;
  }
  return <span>{part.text}</span>;
}

/** Обычный текст с упоминаниями: логины показываются именами */
export function MentionText({ text }: MentionTextProps): ReactNode {
  const parts = splitMentions(text);
  return (
    <>
      {parts.map((part, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: части идут по порядку текста
        <MentionPartView key={index} part={part} />
      ))}
    </>
  );
}
