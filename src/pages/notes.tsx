import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useProjectCrumbs } from '@/components/crumbs';
import { Loading } from '@/components/loading';
import { NoteComposer } from '@/components/notes/note-composer';
import { NoteList } from '@/components/notes/notes-feed';
import { EmptyState, PageHeader } from '@/components/page';
import { Segmented } from '@/components/segmented';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAccess } from '@/lib/access';
import {
  EMPTY_NOTES_FILTER,
  type NoteLevel,
  type NoteSort,
  type NotesFilter,
  notesFilter,
} from '@/lib/notes';
import { usePendingNotes } from '@/lib/outbox';
import { pb } from '@/lib/pb';
import { allNotesQuery, projectQuery, songsQuery } from '@/lib/queries';
import { projectPeople } from '@/lib/roles';
import { cn } from '@/lib/utils';

const LEVELS: { value: NoteLevel; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'project', label: 'Проект' },
  { value: 'song', label: 'Песни' },
  { value: 'stage', label: 'Этапы' },
];
const LEVEL_LABEL: Record<NoteLevel, string> = {
  all: 'Все',
  project: 'Только проекта',
  song: 'Только песен',
  stage: 'Только этапов',
};

const selectClass =
  'h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30 md:h-9';

// Заметки проекта: новая заметка - в сам проект; список - заметки проекта, песен и этапов вместе,
// с поиском, фильтрами и сортировкой.
export function NotesPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/notes' });
  const crumbs = useProjectCrumbs(projectId);
  const project = useQuery(projectQuery(projectId));
  const songs = useQuery(songsQuery(projectId));
  const pending = usePendingNotes({ project: projectId });
  const [f, setF] = useState<NotesFilter>(EMPTY_NOTES_FILTER);
  const [sort, setSort] = useState<NoteSort>('new');
  // запрос - когда человек перестал набирать, а не на каждую букву
  const text = useDebounced(f.text, 300);
  const filter = notesFilter(pb, projectId, { ...f, text });
  const access = useAccess(projectId);
  const notes = useInfiniteQuery(allNotesQuery(projectId, filter, sort));
  const list = notes.data?.pages.flatMap((p) => p.items) ?? [];
  const total = notes.data?.pages[0]?.totalItems ?? 0;
  const set = (patch: Partial<NotesFilter>) => setF({ ...f, ...patch });

  const people = project.data ? projectPeople(project.data).map((x) => x.user) : [];
  const songTitle = songs.data?.find((s) => s.id === f.song)?.title;
  const authorName = people.find((u) => u.id === f.author)?.name;
  const chips = [
    f.level !== 'all' && { label: LEVEL_LABEL[f.level], clear: () => set({ level: 'all' }) },
    f.song && { label: songTitle ?? 'Песня', clear: () => set({ song: '' }) },
    f.author && { label: authorName ?? 'Автор', clear: () => set({ author: '' }) },
    f.withImages && { label: 'С картинками', clear: () => set({ withImages: false }) },
  ].filter((c) => c !== false && c !== '');
  const filtered = f.text.trim() !== '' || chips.length > 0;

  return (
    <div className="max-w-3xl">
      <PageHeader crumbs={crumbs} title="Заметки" />
      <div className="flex flex-col gap-6">
        {access.work && <NoteComposer scope={{ project: projectId }} />}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dim" />
              <label htmlFor="notes-search" className="sr-only">
                Поиск по заметкам
              </label>
              <Input
                id="notes-search"
                type="search"
                placeholder="Поиск"
                value={f.text}
                onChange={(e) => set({ text: e.target.value })}
                className="h-10 pl-9 md:h-9"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 md:h-9">
                  <SlidersHorizontal className="size-4" />
                  <span className="max-sm:sr-only">Фильтры</span>
                  {chips.length > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {chips.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="flex w-80 flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm text-dim">Где</span>
                  <Segmented
                    label="Где"
                    options={LEVELS}
                    value={f.level}
                    onChange={(level) => set({ level })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="filter-song" className="text-sm text-dim">
                    Песня
                  </label>
                  <select
                    id="filter-song"
                    value={f.song}
                    onChange={(e) => set({ song: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Любая</option>
                    {songs.data?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="filter-author" className="text-sm text-dim">
                    Автор
                  </label>
                  <select
                    id="filter-author"
                    value={f.author}
                    onChange={(e) => set({ author: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Любой</option>
                    {people.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label
                  htmlFor="filter-images"
                  className="flex min-h-9 cursor-pointer items-center gap-3"
                >
                  <Checkbox
                    id="filter-images"
                    className="size-5"
                    checked={f.withImages}
                    onCheckedChange={(v) => set({ withImages: v === true })}
                  />
                  Только с картинками
                </label>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm text-dim">Порядок</span>
                  <Segmented
                    label="Порядок"
                    options={[
                      { value: 'new', label: 'Сначала новые' },
                      { value: 'old', label: 'Сначала старые' },
                    ]}
                    value={sort}
                    onChange={setSort}
                  />
                </div>
                {chips.length > 0 && (
                  <Button
                    variant="ghost"
                    className="self-start text-dim"
                    onClick={() => setF({ ...EMPTY_NOTES_FILTER, text: f.text })}
                  >
                    Сбросить фильтры
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={c.clear}
                  className={cn(
                    'flex h-8 items-center gap-1 rounded-lg bg-groove px-2.5 text-sm transition-colors hover:bg-groove/70',
                  )}
                >
                  {c.label}
                  <X className="size-3.5 text-dim" aria-label="убрать" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {notes.isPending && <Loading className="h-24 rounded-xl" />}
          {notes.isError && !notes.data && <p className="text-led-red">Заметки не загрузились.</p>}
          {notes.data && list.length === 0 && pending.length === 0 && (
            <EmptyState>{filtered ? 'Ничего не нашлось' : 'Заметок пока нет'}</EmptyState>
          )}
          {/* прежний результат, пока ищется новый, - чуть приглушён */}
          <div className={cn('transition-opacity', notes.isPlaceholderData && 'opacity-60')}>
            <NoteList
              projectId={projectId}
              notes={list}
              pending={filtered ? [] : pending}
              showOrigin
            />
          </div>
          {notes.hasNextPage && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                disabled={notes.isFetchingNextPage}
                onClick={() => void notes.fetchNextPage()}
              >
                Показать ещё
              </Button>
              <span className="text-sm text-dim tabular-nums">
                {list.length} из {total}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// значение, которое догоняет исходное через ms после последнего изменения
function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}
