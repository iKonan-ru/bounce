import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { CloudOff, Disc3, ImagePlus, Mic, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { type ClipboardEvent, type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AudioPlayer } from '@/components/audio-player';
import { Avatar } from '@/components/avatar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ImageViewer } from '@/components/image-viewer';
import { useFileUrl } from '@/components/images';
import { Markup } from '@/components/markup';
import { MarkupToolbar, useMarkupEditing } from '@/components/markup-toolbar';
import { useMentionPeople, useMentions } from '@/components/mentions';
import { GROUP, GROUP_ROWS } from '@/components/page';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useAccess } from '@/lib/access';
import { useMe } from '@/lib/auth';
import { displayFileName, fileSize, noteDate } from '@/lib/format';
import { shrinkImage } from '@/lib/images';
import {
  MAX_AUDIO_BYTES,
  MAX_AUDIO_FILES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_FILES,
  type Note,
} from '@/lib/model';
import { createNote, type NoteScope } from '@/lib/notes';
import {
  dropPending,
  isNetworkError,
  type PendingNote,
  queueNote,
  usePendingNotes,
} from '@/lib/outbox';
import { collection, pb } from '@/lib/pb';
import { notesQuery, songsQuery, templatesQuery } from '@/lib/queries';
import { songFromNote, titleFromNote } from '@/lib/songs';
import { cn } from '@/lib/utils';

// Заметки одного уровня - проекта, песни или этапа: форма добавления и список.
export function NotesFeed({ scope }: { scope: NoteScope }) {
  const notes = useQuery(notesQuery(scope));
  const pending = usePendingNotes(scope);
  const access = useAccess(scope.project);
  return (
    <div className="flex flex-col gap-3">
      {access.work && <Composer scope={scope} />}
      {notes.isError && !notes.data && (
        <p className="px-1 text-sm text-led-red">Заметки не загрузились.</p>
      )}
      <NoteList notes={notes.data ?? []} pending={pending} />
      {!access.work && notes.data?.length === 0 && (
        <p className="px-1 text-sm text-dim">Заметок нет</p>
      )}
    </div>
  );
}

export function NoteList({
  notes,
  pending = [],
  showOrigin,
}: {
  notes: ReadonlyArray<Note>;
  pending?: ReadonlyArray<PendingNote>;
  showOrigin?: boolean;
}) {
  if (notes.length === 0 && pending.length === 0) return null;
  return (
    <ul className={GROUP_ROWS}>
      {pending.map((p) => (
        <li key={p.id} className="animate-enter">
          <PendingItem note={p} />
        </li>
      ))}
      {notes.map((n) => (
        <li key={n.id} className="animate-enter">
          <NoteItem note={n} showOrigin={showOrigin ?? false} />
        </li>
      ))}
    </ul>
  );
}

function pickFiles(
  list: Iterable<File>,
  current: File[],
  max: number,
  maxBytes: number,
  what: string,
): File[] {
  const picked = Array.from(list);
  const tooBig = picked.filter((f) => f.size > maxBytes);
  if (tooBig.length > 0) toast.error(`${what}: больше ${fileSize(maxBytes)} не загрузить`);
  const next = [...current, ...picked.filter((f) => f.size <= maxBytes)];
  if (next.length > max) toast.error(`${what}: не больше ${max} в одной заметке`);
  return next.slice(0, max);
}

const fileKey = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;

export function Composer({ scope }: { scope: NoteScope }) {
  const me = useMe();
  const client = useQueryClient();
  const id = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const draftKey = `bounce.draft.${scope.project}.${scope.song ?? ''}.${scope.stage ?? ''}`;
  const [text, setTextState] = useState(() => readDraft(draftKey));
  const setText = (v: string) => {
    setTextState(v);
    writeDraft(draftKey, v);
  };
  const [audio, setAudio] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);

  const send = useMutation({
    // без сети заметка не ждёт, а сразу встаёт в очередь
    networkMode: 'always',
    mutationFn: async (): Promise<'sent' | 'queued'> => {
      if (!me) throw new Error('нет входа');
      // фото с телефона уменьшаются до отправки: быстрее грузятся и меньше места в очереди
      const small = await Promise.all(images.map((f) => shrinkImage(f)));
      const queue = () =>
        queueNote({ scope, author: me.id, text: text.trim(), images: small, audio }).then(
          () => 'queued' as const,
        );
      if (!navigator.onLine) return queue();
      const withFiles = audio.length > 0 || images.length > 0;
      setProgress(withFiles ? 0 : null);
      try {
        await createNote(
          pb,
          scope,
          me.id,
          { text, audio, images: small },
          withFiles ? setProgress : undefined,
        );
        return 'sent';
      } catch (e) {
        if (isNetworkError(e)) return queue();
        throw e;
      }
    },
    onSettled: () => setProgress(null),
    onSuccess: async (result) => {
      setText('');
      setAudio([]);
      setImages([]);
      if (result === 'queued') toast('Нет сети: заметка отправится, когда связь появится');
      else await client.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: () => toast.error('Заметка не добавлена: проверьте соединение и размер файлов'),
  });

  const hasContent = text.trim() !== '' || audio.length > 0 || images.length > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (hasContent && !send.isPending) send.mutate();
  }

  const markup = useMarkupEditing(textRef, text, setText);
  const mentions = useMentions({
    ref: textRef,
    value: text,
    setValue: setText,
    people: useMentionPeople(scope.project),
  });
  // панель оформления видна, пока курсор в поле или в нём есть текст; скрывается с задержкой,
  // чтобы нажатие на её кнопку успело сработать (на телефоне фокус уходит раньше нажатия)
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // снимок экрана вставляется прямо из буфера обмена; адрес поверх выделения - ссылка
  function paste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      markup.onPaste(e);
      return;
    }
    e.preventDefault();
    setImages(pickFiles(files, images, MAX_IMAGE_FILES, MAX_IMAGE_BYTES, 'Картинки'));
  }

  const busy = send.isPending;
  return (
    <form
      onSubmit={submit}
      onFocus={(e) => {
        clearTimeout(blurTimer.current);
        // панель появляется только от курсора в поле: нажатие на "Картинку" или "Аудио" не
        // должно сдвигать кнопки
        if (e.target instanceof HTMLTextAreaElement && e.target === textRef.current)
          setFocused(true);
      }}
      onBlur={() => {
        blurTimer.current = setTimeout(() => setFocused(false), 250);
      }}
      className={cn(GROUP, 'focus-within:ring-ring/60')}
    >
      <label htmlFor={`${id}-text`} className="sr-only">
        Новая заметка
      </label>
      <Textarea
        ref={textRef}
        id={`${id}-text`}
        rows={1}
        maxLength={10000}
        placeholder="Написать заметку"
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        onPaste={paste}
        onSelect={mentions.sync}
        onKeyDown={(e) => {
          if (mentions.onKeyDown(e)) return;
          if (markup.onKeyDown(e)) return;
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
        }}
        className="max-h-80 min-h-12 resize-none rounded-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      {mentions.menu}
      {(images.length > 0 || audio.length > 0) && (
        <div className="flex flex-col gap-2 px-4 pb-2">
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {images.map((f, i) => (
                <div
                  key={fileKey(f)}
                  className="relative aspect-square overflow-hidden rounded-md bg-groove"
                >
                  <LocalImage file={f} />
                  <RemoveButton
                    label={`Убрать ${f.name}`}
                    disabled={busy}
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                  />
                </div>
              ))}
            </div>
          )}
          {audio.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {audio.map((f, i) => (
                <li
                  key={fileKey(f)}
                  className="flex max-w-full items-center gap-1 rounded-md bg-groove py-1 pr-1 pl-2 text-xs"
                >
                  <Mic className="size-3.5 shrink-0 text-dim" />
                  <span className="truncate">{f.name}</span>
                  <span className="shrink-0 text-dim">{fileSize(f.size)}</span>
                  <button
                    type="button"
                    aria-label={`Убрать ${f.name}`}
                    disabled={busy}
                    onClick={() => setAudio(audio.filter((_, j) => j !== i))}
                    className="flex size-6 shrink-0 items-center justify-center rounded text-dim hover:text-ink"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {progress !== null && (
        <Progress
          className="mx-4 mb-2 w-auto"
          value={Math.round(progress * 100)}
          aria-label="Загрузка файлов"
        />
      )}
      {(focused || text !== '') && (
        <MarkupToolbar onAction={markup.onAction} disabled={busy} className="px-2" />
      )}
      <div className="flex items-center gap-0.5 px-2 pb-2">
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            setImages(
              pickFiles(e.target.files ?? [], images, MAX_IMAGE_FILES, MAX_IMAGE_BYTES, 'Картинки'),
            );
            e.target.value = '';
          }}
        />
        <input
          ref={audioInput}
          type="file"
          accept="audio/*"
          multiple
          hidden
          onChange={(e) => {
            setAudio(
              pickFiles(e.target.files ?? [], audio, MAX_AUDIO_FILES, MAX_AUDIO_BYTES, 'Аудио'),
            );
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => imageInput.current?.click()}
          className="h-9 text-dim"
        >
          <ImagePlus data-icon="inline-start" />
          Картинка
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => audioInput.current?.click()}
          className="h-9 text-dim"
        >
          <Mic data-icon="inline-start" />
          Аудио
        </Button>
        {hasContent && (
          <Button type="submit" size="sm" className="ml-auto h-9 px-3" disabled={busy}>
            {busy && progress !== null ? `${Math.round(progress * 100)}%` : 'Добавить'}
          </Button>
        )}
      </div>
    </form>
  );
}

function readDraft(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

// недописанный текст заметки переживает закрытие приложения
function writeDraft(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // без хранилища черновик живёт до перезагрузки
  }
}

function PendingItem({ note }: { note: PendingNote }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <article className="px-4 py-3">
      <header className="flex items-center gap-2">
        <CloudOff className={note.rejected ? 'size-4 text-led-red' : 'size-4 text-led-amber'} />
        <p className={note.rejected ? 'flex-1 text-sm text-led-red' : 'flex-1 text-sm text-dim'}>
          {note.rejected ? 'Сервер не принял заметку' : 'Ждёт отправки'}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Удалить черновик"
          onClick={() => setConfirming(true)}
        >
          <Trash2 />
        </Button>
      </header>
      {note.text && <Markup text={note.text} className="mt-2" />}
      {note.images.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {note.images.map((f) => (
            <div key={fileKey(f)} className="aspect-square overflow-hidden rounded-md bg-groove">
              <LocalImage file={f} />
            </div>
          ))}
        </div>
      )}
      {note.audio.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {note.audio.map((f) => (
            <li
              key={fileKey(f)}
              className="flex items-center gap-1 rounded-md bg-groove px-2 py-1 text-xs"
            >
              <Mic className="size-3.5 text-dim" />
              {f.name}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Удалить черновик?"
        confirm="Удалить"
        onConfirm={() => {
          setConfirming(false);
          void dropPending(note.id);
        }}
      />
    </article>
  );
}

function RemoveButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
    >
      <X className="size-4" />
    </button>
  );
}

// превью выбранной, но ещё не загруженной картинки
export function LocalImage({ file }: { file: File }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <img src={url} alt={file.name} className="size-full object-cover" /> : null;
}

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

function NoteItem({ note, showOrigin }: { note: Note; showOrigin: boolean }) {
  const me = useMe();
  const client = useQueryClient();
  const navigate = useNavigate();
  const fileUrl = useFileUrl();
  const songs = useQuery({ ...songsQuery(note.project), enabled: Boolean(note.became_song) });
  const [dialog, setDialog] = useState<'none' | 'delete' | 'song'>('none');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const editMarkup = useMarkupEditing(editRef, draft, setDraft);
  const editMentions = useMentions({
    ref: editRef,
    value: draft,
    setValue: setDraft,
    people: useMentionPeople(note.project),
  });
  const [songTitle, setSongTitle] = useState('');
  const [viewing, setViewing] = useState<string>();
  const templates = useQuery({ ...templatesQuery(note.project), enabled: dialog === 'song' });
  const access = useAccess(note.project);
  // свою заметку правит автор, пока он в проекте не наблюдатель; удалить чужую может редактор
  const mine = me?.id === note.author && access.work;
  const canDelete = mine || access.edit;
  const author = note.expand?.author;
  const became = note.became_song ? songs.data?.find((s) => s.id === note.became_song) : undefined;
  // песней становится заметка самого проекта, ещё не ставшая песней; создаёт песни редактор
  const canMakeSong = !note.song && !note.became_song && access.edit;

  const refresh = () => client.invalidateQueries({ queryKey: ['notes'] });
  const saveText = useMutation({
    mutationFn: () => collection(pb, 'notes').update(note.id, { text: draft.trim() }),
    onSuccess: async () => {
      setEditing(false);
      await refresh();
    },
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });
  const remove = useMutation({
    mutationFn: () => collection(pb, 'notes').delete(note.id),
    onSuccess: async () => {
      setDialog('none');
      await refresh();
    },
    onError: () => toast.error('Заметка не удалена: проверьте соединение'),
  });
  const makeSong = useMutation({
    mutationFn: () => songFromNote(pb, note, songTitle.trim(), templates.data ?? []),
    onSuccess: async (song) => {
      setDialog('none');
      await Promise.all([refresh(), client.invalidateQueries({ queryKey: ['songs'] })]);
      await navigate({
        to: '/p/$projectId/songs/$songId',
        params: { projectId: note.project, songId: song.id },
      });
    },
    onError: () => toast.error('Песня не создана: проверьте соединение'),
  });
  const busy = remove.isPending || saveText.isPending || makeSong.isPending;
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
                className="-mr-1.5 text-dim [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/note:opacity-100 [@media(hover:hover)]:aria-expanded:opacity-100"
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canMakeSong && (
                <DropdownMenuItem
                  onSelect={() => {
                    setSongTitle(titleFromNote(note.text));
                    setDialog('song');
                  }}
                >
                  <Disc3 />
                  Сделать песней
                </DropdownMenuItem>
              )}
              {mine && (
                <DropdownMenuItem
                  onSelect={() => {
                    setDraft(note.text);
                    setEditing(true);
                  }}
                >
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
        <form
          className="mt-2 flex flex-col gap-2 pl-[2.375rem]"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim() !== note.text) saveText.mutate();
            else setEditing(false);
          }}
        >
          <label htmlFor={`edit-${note.id}`} className="sr-only">
            Текст заметки
          </label>
          <MarkupToolbar onAction={editMarkup.onAction} disabled={busy} className="-ml-1.5" />
          <Textarea
            ref={editRef}
            id={`edit-${note.id}`}
            rows={3}
            maxLength={10000}
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onSelect={editMentions.sync}
            onKeyDown={(e) => {
              if (editMentions.onKeyDown(e)) return;
              editMarkup.onKeyDown(e);
            }}
            onPaste={(e) => {
              editMarkup.onPaste(e);
            }}
          />
          {editMentions.menu}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={busy}>
              Сохранить
            </Button>
          </div>
        </form>
      ) : (
        note.text && <Markup text={note.text} className="mt-1.5 pl-[2.375rem]" />
      )}

      {(note.images ?? []).length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-1.5 pl-[2.375rem] sm:grid-cols-4">
          {(note.images ?? []).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setViewing(f)}
              aria-label={`Открыть ${displayFileName(f)}`}
              className="block aspect-square overflow-hidden rounded-md bg-groove"
            >
              {fileUrl(note, f, '480x0') && (
                <img
                  src={fileUrl(note, f, '480x0')}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {(note.audio ?? []).length > 0 && (
        <ul className="mt-2 flex flex-col gap-2 pl-[2.375rem]">
          {(note.audio ?? []).map((f, i) => (
            <li key={f}>
              <AudioPlayer
                src={fileUrl(note, f)}
                name={note.audio_names?.[i] || displayFileName(f)}
                downloadUrl={fileUrl(note, f, undefined, true)}
              />
            </li>
          ))}
        </ul>
      )}

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
      <Dialog open={dialog === 'song'} onOpenChange={(o) => setDialog(o ? 'song' : 'none')}>
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (songTitle.trim()) makeSong.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>Новая песня</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`song-from-${note.id}`}>Название</Label>
              <Input
                id={`song-from-${note.id}`}
                required
                autoFocus
                maxLength={200}
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setDialog('none')}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={busy || !songTitle.trim() || templates.isPending}>
                Создать
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </article>
  );
}
