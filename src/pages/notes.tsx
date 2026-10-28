import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Image as ImageIcon, Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { useProjectCrumbs } from '@/components/crumbs';
import { NoteList } from '@/components/notes';
import { PageHeader } from '@/components/page';
import { Segmented } from '@/components/segmented';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EMPTY_NOTES_FILTER,
  type NoteLevel,
  type NoteSort,
  type NotesFilter,
  notesFilter,
} from '@/lib/notes';
import { pb } from '@/lib/pb';
import { allNotesQuery, projectQuery, songsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

const LEVELS: { value: NoteLevel; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'project', label: 'Проект' },
  { value: 'song', label: 'Песни' },
  { value: 'stage', label: 'Этапы' },
];

const selectClass =
  'h-10 min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30';

// Все заметки проекта - его самого, песен и этапов - с поиском, фильтрами и сортировкой.
export function NotesPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/notes' });
  const crumbs = useProjectCrumbs(projectId);
  const project = useQuery(projectQuery(projectId));
  const songs = useQuery(songsQuery(projectId));
  const [f, setF] = useState<NotesFilter>(EMPTY_NOTES_FILTER);
  const [sort, setSort] = useState<NoteSort>('new');
  const text = useDeferredValue(f.text);
  const filter = notesFilter(pb, projectId, { ...f, text });
  const notes = useQuery(allNotesQuery(projectId, filter, sort));
  const set = (patch: Partial<NotesFilter>) => setF({ ...f, ...patch });

  const people = project.data
    ? [project.data.expand?.owner, ...(project.data.expand?.members ?? [])].filter(
        (u) => u !== undefined,
      )
    : [];
  const filtered = JSON.stringify(f) !== JSON.stringify(EMPTY_NOTES_FILTER);

  return (
    <>
      <PageHeader crumbs={crumbs} title="Все заметки" />
      <div className="mb-5 flex max-w-4xl flex-col gap-3">
        <div className="relative">
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
            className="h-11 pl-9"
          />
        </div>
        <Segmented
          label="Где"
          options={LEVELS}
          value={f.level}
          onChange={(level) => set({ level })}
          className="sm:max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Песня"
            value={f.song}
            onChange={(e) => set({ song: e.target.value })}
            className={cn(selectClass, 'max-w-56')}
          >
            <option value="">Любая песня</option>
            {songs.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Автор"
            value={f.author}
            onChange={(e) => set({ author: e.target.value })}
            className={selectClass}
          >
            <option value="">Любой автор</option>
            {people.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={f.withImages}
            onClick={() => set({ withImages: !f.withImages })}
            className={cn(
              'flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
              f.withImages ? 'border-ink/30 bg-groove text-ink' : 'text-dim hover:text-ink',
            )}
          >
            <ImageIcon className="size-4" />С картинками
          </button>
          <select
            aria-label="Порядок"
            value={sort}
            onChange={(e) => setSort(e.target.value === 'old' ? 'old' : 'new')}
            className={cn(selectClass, 'ml-auto')}
          >
            <option value="new">Сначала новые</option>
            <option value="old">Сначала старые</option>
          </select>
        </div>
      </div>

      <div className="max-w-4xl">
        {notes.isPending && <Skeleton className="h-24 rounded-xl" />}
        {notes.isError && <p className="text-led-red">Заметки не загрузились.</p>}
        {notes.data?.length === 0 && (
          <p className="rounded-xl border border-dashed p-8 text-center text-dim">
            {filtered ? 'Ничего не нашлось' : 'Заметок пока нет'}
          </p>
        )}
        <NoteList notes={notes.data ?? []} showOrigin />
      </div>
    </>
  );
}
