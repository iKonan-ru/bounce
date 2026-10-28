import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Minus, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSongCrumbs } from '@/components/crumbs';
import { EmptyState, PageHeader } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { lyricsParts } from '@/lib/lyrics';
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
    onError: () => toast.error('Текст не сохранён: проверьте соединение'),
  });

  const startEdit = () => {
    setDraft(text);
    setEditing(true);
  };
  const resize = (n: number) => {
    setSize(n);
    writeSize(n);
  };

  const parts = lyricsParts(text);

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
              <Button variant="secondary" onClick={startEdit}>
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
          <label htmlFor="lyrics-text" className="sr-only">
            Текст песни
          </label>
          <Textarea
            id="lyrics-text"
            autoFocus
            rows={18}
            maxLength={50000}
            placeholder={'[Куплет 1]\n...\n\n[Припев]\n...'}
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
