import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Plus, Search, Star } from 'lucide-react';
import { type ReactNode, useDeferredValue, useState } from 'react';
import { FindingDrawer } from '@/components/finding-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  type Category,
  findingsFilter,
  INSTRUMENT_LABEL,
  INSTRUMENTS,
  type Instrument,
} from '@/lib/findings';
import { pb } from '@/lib/pb';
import { fileTokenQuery, findingQuery, findingsQuery, songsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

// Параметры адреса: open - открыть находку, song и stage - новая находка из шторки этапа.
export type FindingsSearch = { open?: string; song?: string; stage?: string; new?: boolean };

export function validateFindingsSearch(raw: Record<string, unknown>): FindingsSearch {
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const out: FindingsSearch = {};
  const open = str(raw['open']);
  const song = str(raw['song']);
  const stage = str(raw['stage']);
  if (open) out.open = open;
  if (song) out.song = song;
  if (stage) out.stage = stage;
  if (raw['new'] === true || raw['new'] === 'true') out.new = true;
  return out;
}

export function FindingsPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/findings' });
  const search = useSearch({ from: '/app/p/$projectId/findings' });
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [instrument, setInstrument] = useState<Instrument | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [library, setLibrary] = useState(false);
  const deferredText = useDeferredValue(text);

  const filter = findingsFilter(pb, projectId, {
    text: deferredText,
    instrument,
    category,
    library,
  });
  const findings = useQuery(findingsQuery(projectId, filter));
  const songs = useQuery(songsQuery(projectId));
  const token = useQuery(fileTokenQuery);
  const opened = useQuery({ ...findingQuery(search.open ?? ''), enabled: Boolean(search.open) });

  const songTitle = (id: string) => songs.data?.find((s) => s.id === id)?.title;
  const filtered = Boolean(text || instrument || category || library);

  const drawerState = search.open
    ? opened.data
      ? { finding: opened.data }
      : null
    : search.new || search.song
      ? {
          draft: {
            ...(search.song ? { song: search.song } : {}),
            ...(search.stage ? { stage: search.stage } : {}),
          },
        }
      : null;

  const close = () =>
    void navigate({ to: '/p/$projectId/findings', params: { projectId }, search: {} });

  return (
    <section>
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Находки</h1>
        <Button
          onClick={() =>
            void navigate({
              to: '/p/$projectId/findings',
              params: { projectId },
              search: { new: true },
            })
          }
        >
          <Plus data-icon="inline-start" />
          Новая находка
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dim" />
        <label htmlFor="findings-search" className="sr-only">
          Поиск по находкам
        </label>
        <Input
          id="findings-search"
          type="search"
          placeholder="Поиск: преамп, Ampeg, тёплый"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={instrument === ''} onClick={() => setInstrument('')}>
          Все
        </Chip>
        {INSTRUMENTS.map((i) => (
          <Chip
            key={i}
            active={instrument === i}
            onClick={() => setInstrument(instrument === i ? '' : i)}
          >
            {INSTRUMENT_LABEL[i]}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label htmlFor="findings-category" className="sr-only">
          Категория
        </label>
        <select
          id="findings-category"
          value={category}
          onChange={(e) => setCategory(CATEGORIES.find((c) => c === e.target.value) ?? '')}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
        >
          <option value="">Любая категория</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <Chip active={library} onClick={() => setLibrary(!library)}>
          <Star className="size-3.5" />
          Библиотека
        </Chip>
      </div>

      {findings.isPending && <Skeleton className="mt-4 h-24 rounded-xl" />}
      {findings.isError && <p className="mt-4 text-led-red">Находки не загрузились.</p>}
      {findings.data?.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed p-6">
          {filtered ? (
            <p className="text-sm text-dim">Ничего не нашлось. Измените поиск или фильтры.</p>
          ) : (
            <>
              <p className="font-medium">Находок пока нет</p>
              <p className="mt-1 text-sm text-dim">
                Записывайте, что сработало: настройки преампа, кабинет, подход к вокалу. Через
                полгода это можно будет найти для другой песни.
              </p>
            </>
          )}
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {findings.data?.map((f) => {
          const thumb = f.images[0];
          const meta = [
            f.instrument && INSTRUMENT_LABEL[f.instrument],
            f.category && CATEGORY_LABEL[f.category],
            f.song && songTitle(f.song),
          ].filter(Boolean);
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: '/p/$projectId/findings',
                    params: { projectId },
                    search: { open: f.id },
                  })
                }
                className="flex w-full gap-3 rounded-xl bg-panel p-3 text-left active:bg-groove"
              >
                {thumb && token.data && (
                  <img
                    src={pb.files.getURL(f, thumb, { thumb: '480x0', token: token.data })}
                    alt=""
                    className="size-16 shrink-0 rounded-md object-cover"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-2">
                    <span className="flex-1 font-medium">{f.title}</span>
                    {f.library && (
                      <Star
                        className="mt-0.5 size-4 shrink-0 text-led-amber"
                        aria-label="В библиотеке"
                      />
                    )}
                  </span>
                  {meta.length > 0 && (
                    <span className="block text-xs text-dim">{meta.join(', ')}</span>
                  )}
                  {f.settings && (
                    <span className="mt-1 line-clamp-2 block text-sm">{f.settings}</span>
                  )}
                  {(f.tags ?? []).length > 0 && (
                    <span className="mt-1 block truncate text-xs text-dim">
                      {(f.tags ?? []).map((t) => `#${t}`).join(' ')}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <FindingDrawer projectId={projectId} state={drawerState} onClose={close} />
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-sm transition-colors',
        active ? 'border-ink/40 bg-groove text-ink' : 'text-dim active:bg-groove',
      )}
    >
      {children}
    </button>
  );
}
