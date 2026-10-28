import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useMe } from '@/lib/auth';
import { noteDate } from '@/lib/format';
import { lyricsParts, saveLyrics } from '@/lib/lyrics';
import { pb } from '@/lib/pb';
import { type LyricsWithAuthor, lyricsQuery, songQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { useWakeLock } from '@/lib/wake-lock';

type Mode = 'read' | 'edit' | 'history';

const MODES: { value: Mode; label: string }[] = [
  { value: 'read', label: 'Чтение' },
  { value: 'edit', label: 'Правка' },
  { value: 'history', label: 'История' },
];

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

export function LyricsPage() {
  const { projectId, songId } = useParams({ from: '/app/p/$projectId/songs/$songId/lyrics' });
  const me = useMe();
  const client = useQueryClient();
  const song = useQuery(songQuery(songId));
  const versions = useQuery(lyricsQuery(songId));
  const current = versions.data?.[0];
  const [mode, setMode] = useState<Mode>('read');
  const [draft, setDraft] = useState('');
  const [size, setSize] = useState(readSize);
  const [preview, setPreview] = useState<LyricsWithAuthor>();

  useWakeLock(mode === 'read');

  // черновик правки - с текущей версии; новая версия от соавтора его обновит
  const currentText = current?.text ?? '';
  useEffect(() => setDraft(currentText), [currentText]);

  useEffect(() => {
    try {
      localStorage.setItem(SIZE_KEY, String(size));
    } catch {
      // без хранилища размер держится до перезагрузки
    }
  }, [size]);

  const save = useMutation({
    mutationFn: (text: string) => {
      if (!me) throw new Error('нет входа');
      return saveLyrics(pb, songId, me.id, text);
    },
    onSuccess: async () => {
      setPreview(undefined);
      setMode('read');
      await client.invalidateQueries({ queryKey: ['lyrics', songId] });
    },
    onError: () => toast.error('Текст не сохранён: проверьте соединение'),
  });

  const parts = lyricsParts(currentText);

  return (
    <section>
      <BackLink to="/p/$projectId/songs/$songId" params={{ projectId, songId }}>
        {song.data?.title ?? 'Песня'}
      </BackLink>
      <h1 className="text-2xl font-semibold tracking-tight">Текст песни</h1>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-panel p-1">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            aria-pressed={mode === m.value}
            onClick={() => setMode(m.value)}
            className={cn(
              'h-9 rounded-md text-sm transition-colors',
              mode === m.value ? 'bg-groove text-ink' : 'text-dim',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {versions.isPending && <Skeleton className="mt-6 h-60 rounded-xl" />}

      {mode === 'read' && versions.isSuccess && (
        <div className="mt-6">
          {parts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6">
              <p className="font-medium">Текста пока нет</p>
              <p className="mt-1 text-sm text-dim">
                Добавьте его в правке. Части песни - строкой в скобках: [Куплет], [Припев].
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-end gap-1">
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
              </div>
              <div className={cn('flex flex-col gap-6 leading-relaxed', SIZES[size])}>
                {parts.map((p, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: части текста только по порядку, их не переставляют
                  <div key={`${p.title}-${i}`}>
                    {p.title && <p className="mb-1 text-sm font-medium text-dim">{p.title}</p>}
                    <p className="whitespace-pre-wrap">{p.lines.join('\n')}</p>
                  </div>
                ))}
              </div>
              {current && (
                <p className="mt-8 text-xs text-dim">
                  Версия от {noteDate(current.created)},{' '}
                  {current.expand?.author?.name ?? 'участник'}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {mode === 'edit' && (
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft !== currentText) save.mutate(draft);
          }}
        >
          <label htmlFor="lyrics-text" className="text-sm text-dim">
            Части песни - строкой в скобках: [Куплет], [Припев]. Сохранение создаёт новую версию,
            прежние остаются в истории.
          </label>
          <Textarea
            id="lyrics-text"
            rows={18}
            maxLength={50000}
            value={draft}
            disabled={save.isPending}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[50dvh] font-sans leading-relaxed"
          />
          <Button type="submit" size="lg" disabled={save.isPending || draft === currentText}>
            Сохранить версию
          </Button>
        </form>
      )}

      {mode === 'history' && versions.isSuccess && (
        <div className="mt-6">
          {versions.data.length === 0 && <p className="text-sm text-dim">Версий пока нет.</p>}
          <ul className="flex flex-col">
            {versions.data.map((v, i) => (
              <li key={v.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => setPreview(preview?.id === v.id ? undefined : v)}
                  className="flex min-h-12 w-full items-center gap-3 py-2 text-left active:bg-panel"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">
                      {noteDate(v.created)}, {v.expand?.author?.name ?? 'участник'}
                    </span>
                    <span className="block truncate text-xs text-dim">
                      {v.text
                        .trim()
                        .split('\n')
                        .find((l) => l.trim() && !/^\[.+\]$/.test(l.trim())) ?? 'пустой текст'}
                    </span>
                  </span>
                  {i === 0 && <span className="text-xs text-led-green">текущая</span>}
                </button>
                {preview?.id === v.id && (
                  <div className="mb-3 rounded-xl bg-panel p-3">
                    <p className="max-h-80 overflow-y-auto text-sm whitespace-pre-wrap">{v.text}</p>
                    {i > 0 && (
                      <Button
                        className="mt-3"
                        variant="secondary"
                        disabled={save.isPending}
                        onClick={() => save.mutate(v.text)}
                      >
                        Вернуть эту версию
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
