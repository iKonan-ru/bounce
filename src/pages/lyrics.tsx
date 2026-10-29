import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Copy, Minus, Pencil, Plus } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useSongCrumbs } from '@/components/crumbs';
import { Loading } from '@/components/loading';
import { EmptyState, PageHeader } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAccess } from '@/lib/access';
import { useMe } from '@/lib/auth';
import { errorText } from '@/lib/errors';
import { insertTag, LYRICS_TAGS, lyricsParts, numberVerses, plainLyrics } from '@/lib/lyrics';
import { collection, pb } from '@/lib/pb';
import { songQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { useStoredChoice } from '@/lib/stored-choice';
import { LYRICS_DRAFT_PREFIX } from '@/lib/text-drafts';
import { cn } from '@/lib/utils';
import { useWakeLock } from '@/lib/wake-lock';

// размер шрифта чтения - удобство этого устройства
const SIZE_KEY = 'bounce.lyrics-size';
const SIZES = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl'];

function parseSize(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < SIZES.length ? n : 1;
}

// Недописанная правка текста переживает уход со страницы и закрытие приложения: она лежит на
// устройстве, пока её не сохранят или не отбросят. Вместе с ней - чья она и с какого текста её
// начали (base): если текст с тех пор изменили на сервере, человек увидит это до сохранения, а
// не затрёт чужую правку молча. Выход из приложения стирает черновики (lib/offline.ts).
type LyricsDraft = { user: string; base: string; draft: string };

function readLyricsDraft(songId: string, user: string): LyricsDraft | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LYRICS_DRAFT_PREFIX + songId) ?? 'null');
    if (
      typeof v === 'object' &&
      v !== null &&
      'user' in v &&
      'base' in v &&
      'draft' in v &&
      v.user === user &&
      typeof v.base === 'string' &&
      typeof v.draft === 'string'
    ) {
      return { user, base: v.base, draft: v.draft };
    }
  } catch {
    // нет хранилища или запись не разобрать - черновика нет
  }
  return null;
}

function writeLyricsDraft(songId: string, value: LyricsDraft | null): void {
  try {
    if (value === null) localStorage.removeItem(LYRICS_DRAFT_PREFIX + songId);
    else localStorage.setItem(LYRICS_DRAFT_PREFIX + songId, JSON.stringify(value));
  } catch {
    // без хранилища черновик живёт, пока открыта страница
  }
}

// Страница пересоздаётся при смене песни: иначе черновик одной песни попал бы в другую.
export function LyricsPage() {
  const { songId } = useParams({ from: '/app/p/$projectId/songs/$songId/lyrics' });
  return <Lyrics key={songId} />;
}

function Lyrics() {
  const { projectId, songId } = useParams({ from: '/app/p/$projectId/songs/$songId/lyrics' });
  const me = useMe()?.id ?? '';
  const client = useQueryClient();
  const song = useQuery(songQuery(songId));
  const crumbs = useSongCrumbs(projectId, songId);
  const access = useAccess(projectId);
  const text = song.data?.lyrics ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  // с какого текста начата правка: если он на сервере уже другой - предупреждение
  const [base, setBase] = useState('');
  const [size, setSize] = useStoredChoice(SIZE_KEY, parseSize, 1);
  // черновик с прошлого раза, пока его не открыли и не отбросили
  const [stored, setStored] = useState(() => readLyricsDraft(songId, me));
  const [confirmCancel, setConfirmCancel] = useState(false);
  const changed = editing && draft !== text;

  useEffect(() => {
    if (editing) {
      writeLyricsDraft(songId, draft === text ? null : { user: me, base, draft });
    }
  }, [editing, draft, text, songId, me, base]);
  // сохранённый черновик совпал с текстом (сохранение прошло, а ответ потерялся) - он не нужен
  useEffect(() => {
    if (stored && song.isSuccess && stored.draft === text) {
      writeLyricsDraft(songId, null);
      setStored(null);
    }
  }, [stored, song.isSuccess, text, songId]);
  const outdated = editing && base !== text;

  const forget = () => {
    writeLyricsDraft(songId, null);
    setStored(null);
  };

  // экран не гаснет, пока текст открыт для чтения
  useWakeLock(!editing && text !== '');

  const save = useMutation({
    mutationFn: (lyrics: string) => collection(pb, 'songs').update(songId, { lyrics }),
    onSuccess: async () => {
      setEditing(false);
      forget();
      await client.invalidateQueries({ queryKey: queryKeys.songs.all });
    },
    onError: (e) => toast.error(errorText(e, 'Текст не сохранён: проверьте соединение')),
  });

  const startEdit = () => {
    const saved = readLyricsDraft(songId, me);
    setDraft(saved?.draft ?? text);
    setBase(saved?.base ?? text);
    setStored(null);
    setEditing(true);
  };
  const cancel = () => {
    if (changed) {
      setConfirmCancel(true);
      return;
    }
    forget();
    setEditing(false);
  };

  const parts = numberVerses(lyricsParts(text));
  const area = useRef<HTMLTextAreaElement>(null);
  // куда поставить курсор после вставки метки: сразу после отрисовки нового текста
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = area.current;
    if (el && caret.current !== null && el.value === draft) {
      el.focus();
      el.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  }, [draft]);

  // метка части - на месте курсора; фокус остаётся в поле, чтобы сразу писать дальше
  const addTag = (tag: string) => {
    const el = area.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const next = insertTag({ value: draft, start, end }, tag);
    caret.current = next.start;
    setDraft(next.value);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainLyrics(text));
      toast.success('Текст скопирован');
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title="Текст песни"
        actions={
          !editing &&
          text && (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Мельче"
                disabled={size === 0}
                onClick={() => setSize(size - 1)}
              >
                <Minus />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Крупнее"
                disabled={size === SIZES.length - 1}
                onClick={() => setSize(size + 1)}
              >
                <Plus />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Скопировать текст без меток"
                title="Скопировать текст без меток"
                onClick={copy}
              >
                <Copy />
              </Button>
              {access.edit && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Изменить"
                    className="sm:hidden"
                    onClick={startEdit}
                  >
                    <Pencil />
                  </Button>
                  <Button variant="secondary" className="max-sm:hidden" onClick={startEdit}>
                    <Pencil data-icon="inline-start" />
                    Изменить
                  </Button>
                </>
              )}
            </>
          )
        }
      />
      {song.isPending && <Loading className="h-60 rounded-xl" />}

      {access.edit && !editing && stored !== null && stored.draft !== text && (
        <div className="mb-4 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-panel px-4 py-3 text-sm ring-1 ring-border/70 dark:ring-border/40">
          <span className="flex-1">
            Есть несохранённая правка текста.
            {stored.base !== text && ' Текст с тех пор изменили.'}
          </span>
          <Button size="sm" variant="ghost" onClick={forget}>
            Отбросить
          </Button>
          <Button size="sm" variant="secondary" onClick={startEdit}>
            <Pencil data-icon="inline-start" />
            Продолжить
          </Button>
        </div>
      )}

      {song.isSuccess && !editing && !text && (
        <EmptyState
          action={
            access.edit && (
              <Button variant="secondary" onClick={startEdit}>
                <Pencil data-icon="inline-start" />
                Написать текст
              </Button>
            )
          }
        >
          Текста пока нет
        </EmptyState>
      )}

      {!editing && text && (
        <div className={cn('flex max-w-3xl flex-col gap-6 leading-relaxed', SIZES[size])}>
          {parts.map((p, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: части текста идут по порядку, их не переставляют
            <div key={`${p.title}-${i}`}>
              {p.title && <p className="mb-1 text-sm font-medium text-dim">{p.title}</p>}
              <p className="whitespace-pre-wrap">{p.lines.join('\n')}</p>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <form
          className="flex max-w-3xl flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft !== text) save.mutate(draft);
            else setEditing(false);
          }}
        >
          <div
            role="toolbar"
            aria-label="Части песни"
            className="sticky top-0 z-10 -mx-4 flex gap-1.5 overflow-x-auto bg-console/95 px-4 py-2 backdrop-blur sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]"
          >
            {LYRICS_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                disabled={save.isPending}
                // нажатие не забирает фокус у поля: курсор остаётся на месте
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(tag)}
                className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-panel px-3 text-sm ring-1 ring-border/70 transition-colors hover:bg-groove active:bg-groove md:h-8 dark:ring-border/40"
              >
                <Plus className="size-3.5 text-dim" />
                {tag}
              </button>
            ))}
          </div>
          {outdated && (
            <p className="text-sm text-led-amber">
              Пока шла эта правка, текст песни изменили. Сохранение заменит новую версию.
            </p>
          )}
          <label htmlFor="lyrics-text" className="sr-only">
            Текст песни
          </label>
          <Textarea
            ref={area}
            id="lyrics-text"
            autoFocus
            rows={18}
            maxLength={50000}
            placeholder={'[Куплет]\n...\n\n[Припев]\n...'}
            value={draft}
            disabled={save.isPending}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[55dvh] leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={save.isPending} onClick={cancel}>
              Отмена
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Сохранить
            </Button>
          </div>
        </form>
      )}
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Отменить правки?"
        description="Изменения в тексте пропадут."
        confirm="Отменить правки"
        onConfirm={() => {
          setConfirmCancel(false);
          forget();
          setEditing(false);
        }}
      />
    </>
  );
}
