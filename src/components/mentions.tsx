import { useQuery } from '@tanstack/react-query';
import {
  type CSSProperties,
  type KeyboardEvent,
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
  insertMention,
  matchPeople,
  mentionQuery,
  type Person,
  splitMentions,
} from '@/lib/mentions';
import { projectPeople, type User } from '@/lib/model';
import { projectQuery, usersQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

// люди проекта, которых можно упомянуть
export function useMentionPeople(projectId: string | undefined): User[] {
  const project = useQuery({ ...projectQuery(projectId ?? ''), enabled: Boolean(projectId) });
  return project.data ? projectPeople(project.data).map((p) => p.user) : [];
}

// Кто из упомянутых становится исполнителем: упомянуть можно и наблюдателя, но работу ему не
// назначить (сервер отказывает, pb_hooks/planner.pb.js).
export function useMentionWorkers(projectId: string | undefined): User[] {
  const project = useQuery({ ...projectQuery(projectId ?? ''), enabled: Boolean(projectId) });
  return project.data
    ? projectPeople(project.data)
        .filter((p) => p.role !== 'viewer')
        .map((p) => p.user)
    : [];
}

type Field = HTMLInputElement | HTMLTextAreaElement;

// Упоминания в поле ввода: после "@" под полем - список подходящих людей; стрелки, Enter или Tab
// - выбрать, Escape - закрыть. В поле вставляется @логин, при показе текста - имя.
// Список рисуется в портале под полем: в окне - внутри окна (иначе нажатие на него закрыло бы
// окно), иначе - в body; так его не обрезают блоки со скруглёнными краями.
export function useMentions<T extends Field>({
  ref,
  value,
  setValue,
  people,
}: {
  ref: RefObject<T | null>;
  value: string;
  setValue: (v: string) => void;
  people: ReadonlyArray<User>;
}): {
  menu: ReactNode;
  onKeyDown: (e: KeyboardEvent<T>) => boolean;
  sync: () => void;
} {
  const [state, setState] = useState<{ start: number; query: string } | null>(null);
  const [active, setActive] = useState(0);
  const [closedAt, setClosedAt] = useState<number | null>(null);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el || document.activeElement !== el) {
      setState(null);
      return;
    }
    const q = mentionQuery(el.value, el.selectionStart ?? el.value.length);
    // закрытый Escape список не открывается снова, пока не начали новое упоминание
    if (q && closedAt === q.start) {
      setState(null);
      return;
    }
    setState((prev) => (prev?.start === q?.start && prev?.query === q?.query ? prev : q));
    setActive(0);
  }, [ref, closedAt]);

  // value меняется и когда текст вставили кнопками: сверяемся с курсором после отрисовки
  // biome-ignore lint/correctness/useExhaustiveDependencies: пересчёт - именно при смене текста
  useEffect(() => {
    sync();
  }, [value, sync]);

  const items = state ? matchPeople(people, state.query) : [];
  const open = state !== null && items.length > 0;

  // Для экранного диктора поле - выпадающий список (ARIA combobox): фокус остаётся в поле,
  // выбранный человек объявляется через aria-activedescendant. Атрибуты ставятся здесь, а не в
  // каждом поле с упоминаниями. Многострочное поле остаётся полем: combobox бывает однострочным.
  const listId = useId();
  const optionId = (i: number) => `${listId}-${i}`;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el instanceof HTMLInputElement) {
      el.setAttribute('role', 'combobox');
      el.setAttribute('aria-expanded', String(open));
    }
    el.setAttribute('aria-autocomplete', 'list');
    if (open) {
      el.setAttribute('aria-controls', listId);
      el.setAttribute('aria-activedescendant', optionId(active));
    } else {
      el.removeAttribute('aria-controls');
      el.removeAttribute('aria-activedescendant');
    }
  });

  // место списка: под полем, у левого края
  const [place, setPlace] = useState<{ host: Element; style: CSSProperties } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) {
      setPlace(null);
      return;
    }
    const measure = () => {
      const r = el.getBoundingClientRect();
      const dialog = el.closest('[data-slot="dialog-content"]');
      if (dialog) {
        const d = dialog.getBoundingClientRect();
        setPlace({
          host: dialog,
          style: {
            position: 'absolute',
            top: r.bottom - d.top + dialog.scrollTop + 4,
            left: Math.max(8, r.left - d.left),
          },
        });
      } else {
        setPlace({
          host: document.body,
          style: { position: 'fixed', top: r.bottom + 4, left: Math.max(8, r.left) },
        });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, ref]);

  function pick(p: Person) {
    const el = ref.current;
    if (!el || !state) return;
    const next = insertMention(value, state.start, el.selectionStart ?? value.length, p.username);
    setValue(next.value);
    setState(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.caret, next.caret);
    });
  }

  function onKeyDown(e: KeyboardEvent<T>): boolean {
    if (!open) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const d = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + d + items.length) % items.length);
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      const p = items[active];
      if (!p) return false;
      e.preventDefault();
      pick(p);
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setClosedAt(state?.start ?? null);
      setState(null);
      return true;
    }
    return false;
  }

  const list = (
    <div
      id={listId}
      role="listbox"
      aria-label="Упомянуть"
      style={place?.style}
      className="z-[70] w-64 max-w-[calc(100vw-2rem)] animate-in fade-in-0 zoom-in-95 rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100"
    >
      {items.map((p, i) => (
        <button
          key={p.id}
          type="button"
          id={optionId(i)}
          role="option"
          aria-selected={i === active}
          tabIndex={-1}
          // нажатие не уводит фокус из поля
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setActive(i)}
          onClick={() => pick(p)}
          className={cn(
            'flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 text-left md:min-h-9',
            i === active && 'bg-groove/70',
          )}
        >
          <Avatar user={p} className="size-6 text-[0.625rem]" />
          <span className="min-w-0 flex-1 truncate">{p.name}</span>
          <span className="shrink-0 text-xs text-dim">@{p.username}</span>
        </button>
      ))}
    </div>
  );
  const menu = open && place ? createPortal(list, place.host) : null;

  return { menu, onKeyDown, sync };
}

// Имя вместо @логина; кого нет среди пользователей - логин как есть.
export function MentionName({ username }: { username: string }) {
  const users = useQuery(usersQuery);
  const user = users.data?.find((u) => u.username === username);
  return (
    <span
      title={`@${username}`}
      className={cn(
        'rounded-md px-1 py-px font-medium whitespace-nowrap',
        user ? 'bg-groove/80 text-ink' : 'text-dim',
      )}
    >
      {user ? user.name : `@${username}`}
    </span>
  );
}

// Обычный текст с упоминаниями: логины показываются именами.
export function MentionText({ text }: { text: string }) {
  return (
    <>
      {splitMentions(text).map((p, i) =>
        p.t === 'mention' ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: части идут по порядку текста
          <MentionName key={i} username={p.username} />
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: части идут по порядку текста
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}
