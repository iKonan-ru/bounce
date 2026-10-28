import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Copy, Minus, Pencil, Plus } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSongCrumbs } from '@/components/crumbs';
import { EmptyState, PageHeader } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { errorText } from '@/lib/errors';
import { insertTag, LYRICS_TAGS, lyricsParts, numberVerses, plainLyrics } from '@/lib/lyrics';
import { collection, pb } from '@/lib/pb';
import { songQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { useWakeLock } from '@/lib/wake-lock';

// размер шрифта чтения - удобство этого устройства
const SIZE_KEY = 'bounce.lyrics-size';
const SIZES = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl'];

function readSize(): number {
  try {
    const n = Number(localStorage.getItem(SIZE_KEY));
    return Number.isInteger(n) && n >= 0 && n < SIZES.length ? n : 1;
  } catch {
    return 1;
  }
}

function writeSize(n: number): void {
  try {
    localStorage.setItem(SIZE_KEY, String(n));
  } catch {
    // без хранилища размер держится до перезагрузки
  }
}

export function LyricsPage() {
  const { projectId, songId } = useParams({ from: '/app/p/$projectId/songs/$songId/lyrics' });
  const client = useQueryClient();
  const song = useQuery(songQuery(songId));
  const crumbs = useSongCrumbs(projectId, songId);
  const text = song.data?.lyrics ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [size, setSize] = useState(readSize);

  // экран не гаснет, пока текст открыт для чтения
  useWakeLock(!editing && text !== '');

  const save = useMutation({
    mutationFn: (lyrics: string) => collection(pb, 'songs').update(songId, { lyrics }),
    onSuccess: async () => {
      setEditing(false);
      await client.invalidateQueries({ queryKey: ['songs'] });
    },
    onError: (e) => toast.error(errorText(e, 'Текст не сохранён: проверьте соединение')),
  });

  const startEdit = () => {
    setDraft(text);
    setEditing(true);
  };
  const resize = (n: number) => {
    setSize(n);
    writeSize(n);
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
                onClick={() => resize(size - 1)}
              >
                <Minus />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Крупнее"
                disabled={size === SIZES.length - 1}
                onClick={() => resize(size + 1)}
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
          )
        }
      />
      {song.isPending && <Skeleton className="h-60 rounded-xl" />}

      {song.isSuccess && !editing && !text && (
        <EmptyState
          action={
            <Button variant="secondary" onClick={startEdit}>
              <Pencil data-icon="inline-start" />
              Написать текст
            </Button>
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
            <Button
              type="button"
              variant="ghost"
              disabled={save.isPending}
              onClick={() => setEditing(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Сохранить
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
