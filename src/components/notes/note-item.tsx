import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Disc3, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AudioPlayer } from '@/components/audio-player';
import { Avatar } from '@/components/avatar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ImageViewer } from '@/components/image-viewer';
import { useFileUrl } from '@/components/images';
import { Markup } from '@/components/markup';
import { NoteAttachments } from '@/components/notes/attachments';
import { MakeSongDialog } from '@/components/notes/make-song-dialog';
import { NoteEditForm } from '@/components/notes/note-edit-form';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { displayFileName, noteDate } from '@/lib/format';
import type { Note } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { songsQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import type { Abilities } from '@/lib/roles';

// откуда заметка: проект, песня или этап песни
function Origin({ note }: { note: Note }) {
  const song = note.expand?.song;
  const stage = note.expand?.stage;
  const cls = 'truncate text-xs text-dim hover:text-ink';
  if (stage && song) {
    return (
      <Link
        to="/p/$projectId/songs/$songId/stages/$stageId"
        params={{ projectId: note.project, songId: song.id, stageId: stage.id }}
        className={cls}
      >
        {song.title} · {stage.title}
      </Link>
    );
  }
  if (song) {
    return (
      <Link
        to="/p/$projectId/songs/$songId"
        params={{ projectId: note.project, songId: song.id }}
        className={cls}
      >
        {song.title}
      </Link>
    );
  }
  return (
    <Link to="/p/$projectId" params={{ projectId: note.project }} className={cls}>
      Проект
    </Link>
  );
}

// Заметка в ленте: автор, когда, откуда; текст, картинки, аудио; правка, удаление, "Сделать песней".
export function NoteItem({
  note,
  showOrigin,
  access,
  meId,
}: {
  note: Note;
  showOrigin: boolean;
  access: Abilities;
  meId: string | undefined;
}) {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const songs = useQuery({ ...songsQuery(note.project), enabled: Boolean(note.became_song) });
  const [dialog, setDialog] = useState<'none' | 'delete' | 'song'>('none');
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState<string>();
  // свою заметку правит автор, пока он в проекте не наблюдатель; удалить чужую может редактор
  const mine = meId === note.author && access.work;
  const canDelete = mine || access.edit;
  const author = note.expand?.author;
  const became = note.became_song ? songs.data?.find((s) => s.id === note.became_song) : undefined;
  // песней становится заметка самого проекта, ещё не ставшая песней; создаёт песни редактор
  const canMakeSong = !note.song && !note.became_song && access.edit;

  const remove = useMutation({
    mutationFn: () => collection(pb, 'notes').delete(note.id),
    onSuccess: async () => {
      setDialog('none');
      await client.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
    onError: () => toast.error('Заметка не удалена: проверьте соединение'),
  });
  const busy = remove.isPending;
  const hasMenu = mine || canDelete || canMakeSong;

  return (
    <article className="group/note px-4 py-3">
      <header className="flex items-center gap-2.5">
        <Avatar user={author} className="size-7 text-xs" />
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="truncate text-sm font-medium">{author?.name ?? 'Участник'}</span>
          <span className="shrink-0 text-xs text-dim">{noteDate(note.created)}</span>
          {showOrigin && <Origin note={note} />}
        </div>
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Действия с заметкой"
                disabled={busy}
                className="-mr-1.5 text-dim [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/note:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:aria-expanded:opacity-100"
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canMakeSong && (
                <DropdownMenuItem onSelect={() => setDialog('song')}>
                  <Disc3 />
                  Сделать песней
                </DropdownMenuItem>
              )}
              {mine && (
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <Pencil />
                  Изменить текст
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem variant="destructive" onSelect={() => setDialog('delete')}>
                  <Trash2 />
                  Удалить
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {editing ? (
        <NoteEditForm note={note} onDone={() => setEditing(false)} />
      ) : (
        note.text && <Markup text={note.text} className="mt-1.5 pl-[2.375rem]" />
      )}

      <NoteAttachments
        images={(note.images ?? []).map((f) => ({
          key: f,
          open: { label: `Открыть ${displayFileName(f)}`, onClick: () => setViewing(f) },
          content: fileUrl(note, f, '480x0') && (
            <img
              src={fileUrl(note, f, '480x0')}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ),
        }))}
        audio={(note.audio ?? []).map((f, i) => ({
          key: f,
          content: (
            <AudioPlayer
              record={note}
              file={f}
              name={note.audio_names?.[i] || displayFileName(f)}
              // для системы, что играет: теги MP3, иначе имя файла
              readTags
            />
          ),
        }))}
        audioAs="players"
        className="pl-[2.375rem]"
      />

      {became && (
        <Link
          to="/p/$projectId/songs/$songId"
          params={{ projectId: note.project, songId: became.id }}
          className="mt-1 ml-[2.375rem] flex min-h-9 items-center gap-2 text-sm text-led-green"
        >
          <Disc3 className="size-4" />
          Стала песней: {became.title}
        </Link>
      )}

      <ImageViewer
        src={viewing ? fileUrl(note, viewing) : undefined}
        title={viewing ? displayFileName(viewing) : 'Картинка'}
        downloadUrl={viewing ? fileUrl(note, viewing, undefined, true) : undefined}
        onClose={() => setViewing(undefined)}
      />

      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(o) => setDialog(o ? 'delete' : 'none')}
        title="Удалить заметку?"
        description="Вместе с ней удалятся приложенные файлы."
        confirm="Удалить"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
      {dialog === 'song' && <MakeSongDialog note={note} onClose={() => setDialog('none')} />}
    </article>
  );
}
