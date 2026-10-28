import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Meter } from '@/components/meter';
import { NewSongDrawer } from '@/components/new-song-drawer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SONG_STATUS_LABEL } from '@/lib/model';
import { currentStage, songProgress } from '@/lib/progress';
import { songsQuery, stagesOf } from '@/lib/queries';

export function SongsPage() {
  const songs = useQuery(songsQuery);
  const [creating, setCreating] = useState(false);

  return (
    <section>
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Песни</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus data-icon="inline-start" />
          Новая песня
        </Button>
      </header>

      {songs.isPending && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      )}

      {songs.isError && (
        <p className="text-led-red">
          Песни не загрузились. Проверьте соединение и обновите страницу.
        </p>
      )}

      {songs.data?.length === 0 && (
        <div className="rounded-xl border border-dashed p-6">
          <p className="font-medium">Песен пока нет</p>
          <p className="mt-1 text-sm text-dim">
            Добавьте первую: этапы производства подставятся из шаблона, останется отмечать
            сделанное.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {songs.data?.map((song) => {
          const stages = stagesOf(song);
          const p = songProgress(stages);
          const now = currentStage(stages);
          return (
            <li key={song.id}>
              <Link
                to="/songs/$songId"
                params={{ songId: song.id }}
                className="block rounded-xl bg-panel p-4 transition-colors active:bg-groove"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="truncate text-lg font-medium">{song.title}</h2>
                  <span className="shrink-0 text-sm text-dim">{p.percent}%</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-dim">
                  {song.status === 'active'
                    ? (now?.title ?? 'Все этапы готовы')
                    : SONG_STATUS_LABEL[song.status]}
                </p>
                <div className="mt-3">
                  <Meter stages={stages} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <NewSongDrawer open={creating} onOpenChange={setCreating} />
    </section>
  );
}
