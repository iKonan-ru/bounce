import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Lightbulb, MessageSquare, Mic, Trash2, X } from 'lucide-react';
import { type FormEvent, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/avatar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMe } from '@/lib/auth';
import { displayFileName, fileSize, noteDate } from '@/lib/format';
import {
  MAX_AUDIO_BYTES,
  MAX_AUDIO_FILES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_FILES,
  type Note,
  type NoteKind,
} from '@/lib/model';
import { createNote, type NoteScope } from '@/lib/notes';
import { collection, pb } from '@/lib/pb';
import { fileTokenQuery, notesQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

// surface: где лента - на странице (карточки на фоне страницы) или в шторке (на фоне панели)
type Props = { scope: NoteScope; empty: string; surface?: 'page' | 'sheet' };

// Лента идей и комментариев одного уровня: проекта, песни или этапа.
export function NotesFeed({ scope, empty, surface = 'page' }: Props) {
  const card = surface === 'page' ? 'bg-panel' : 'bg-console';
  const notes = useQuery(notesQuery(scope));
  return (
    <div className="flex flex-col gap-4">
      <Composer scope={scope} card={card} />
      {notes.isError && <p className="text-sm text-led-red">Лента не загрузилась.</p>}
      {notes.data?.length === 0 && <p className="text-sm text-dim">{empty}</p>}
      <ul className="flex flex-col gap-3">
        {notes.data?.map((n) => (
          <li key={n.id}>
            <NoteItem note={n} card={card} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function pickFiles(
  list: FileList | null,
  current: File[],
  max: number,
  maxBytes: number,
  what: string,
): File[] {
  const picked = Array.from(list ?? []);
  const tooBig = picked.filter((f) => f.size > maxBytes);
  if (tooBig.length > 0) {
    toast.error(`${what}: больше ${fileSize(maxBytes)} не загрузить (${tooBig[0]?.name})`);
  }
  const next = [...current, ...picked.filter((f) => f.size <= maxBytes)];
  if (next.length > max) toast.error(`${what}: не больше ${max} в одной записи`);
  return next.slice(0, max);
}

function Composer({ scope, card }: { scope: NoteScope; card: string }) {
  const me = useMe();
  const client = useQueryClient();
  const id = useId();
  const audioInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<NoteKind>('comment');
  const [text, setText] = useState('');
  const [audio, setAudio] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);

  const send = useMutation({
    mutationFn: () => {
      if (!me) throw new Error('нет входа');
      return createNote(pb, scope, me.id, { kind, text, audio, images });
    },
    onSuccess: async () => {
      setText('');
      setAudio([]);
      setImages([]);
      await client.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: () => toast.error('Запись не добавлена: проверьте соединение и размер файлов'),
  });

  const hasContent = text.trim() !== '' || audio.length > 0 || images.length > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (hasContent) send.mutate();
  }

  const files = [
    ...audio.map((f, i) => ({ f, remove: () => setAudio(audio.filter((_, j) => j !== i)) })),
    ...images.map((f, i) => ({ f, remove: () => setImages(images.filter((_, j) => j !== i)) })),
  ];

  return (
    <form onSubmit={submit} className={cn('flex flex-col gap-2 rounded-xl p-3', card)}>
      <fieldset className="flex gap-2" disabled={send.isPending}>
        <legend className="sr-only">Тип записи</legend>
        {(['comment', 'idea'] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors',
              kind === k ? 'bg-groove text-ink' : 'text-dim active:bg-groove',
            )}
          >
            {k === 'idea' ? <Lightbulb className="size-4" /> : <MessageSquare className="size-4" />}
            {k === 'idea' ? 'Идея' : 'Комментарий'}
          </button>
        ))}
      </fieldset>
      <label htmlFor={`${id}-text`} className="sr-only">
        Текст записи
      </label>
      <Textarea
        id={`${id}-text`}
        rows={2}
        maxLength={10000}
        placeholder={kind === 'idea' ? 'Что попробовать' : 'Комментарий'}
        value={text}
        disabled={send.isPending}
        onChange={(e) => setText(e.target.value)}
        className={card === 'bg-panel' ? 'bg-console' : 'bg-panel'}
      />
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map(({ f, remove }) => (
            <li
              key={`${f.name}-${f.size}-${f.lastModified}`}
              className="flex max-w-full items-center gap-1 rounded-md bg-groove py-1 pr-1 pl-2 text-xs"
            >
              <span className="truncate">{f.name}</span>
              <span className="shrink-0 text-dim">{fileSize(f.size)}</span>
              <button
                type="button"
                aria-label={`Убрать ${f.name}`}
                disabled={send.isPending}
                onClick={remove}
                className="flex size-6 shrink-0 items-center justify-center rounded text-dim active:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1">
        <input
          ref={audioInput}
          type="file"
          accept="audio/*"
          multiple
          hidden
          onChange={(e) => {
            setAudio(pickFiles(e.target.files, audio, MAX_AUDIO_FILES, MAX_AUDIO_BYTES, 'Аудио'));
            e.target.value = '';
          }}
        />
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            setImages(
              pickFiles(e.target.files, images, MAX_IMAGE_FILES, MAX_IMAGE_BYTES, 'Изображения'),
            );
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Приложить аудио"
          disabled={send.isPending}
          onClick={() => audioInput.current?.click()}
        >
          <Mic />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Приложить изображение"
          disabled={send.isPending}
          onClick={() => imageInput.current?.click()}
        >
          <ImageIcon />
        </Button>
        <Button type="submit" className="ml-auto" disabled={!hasContent || send.isPending}>
          {send.isPending ? 'Загрузка...' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}

function NoteItem({ note, card }: { note: Note; card: string }) {
  const me = useMe();
  const client = useQueryClient();
  const token = useQuery(fileTokenQuery);
  const [confirming, setConfirming] = useState(false);
  const mine = me?.id === note.author;
  const author = note.expand?.author;

  const toggleUsed = useMutation({
    mutationFn: () => collection(pb, 'notes').update(note.id, { used: !note.used }),
    onSettled: () => client.invalidateQueries({ queryKey: ['notes'] }),
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });
  const remove = useMutation({
    mutationFn: () => collection(pb, 'notes').delete(note.id),
    onSuccess: async () => {
      setConfirming(false);
      await client.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: () => toast.error('Запись не удалена: проверьте соединение'),
  });
  const busy = toggleUsed.isPending || remove.isPending;

  const url = (file: string, thumb?: string) =>
    token.data
      ? pb.files.getURL(note, file, { token: token.data, ...(thumb ? { thumb } : {}) })
      : undefined;

  return (
    <article className={cn('rounded-xl p-3', card)}>
      <header className="flex items-center gap-2">
        <Avatar name={author?.name ?? '?'} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{author?.name ?? 'Участник'}</p>
          <p className="text-xs text-dim">{noteDate(note.created)}</p>
        </div>
        {note.kind === 'idea' && (
          <span
            className={cn(
              'flex shrink-0 items-center gap-1 text-xs',
              note.used ? 'text-led-green' : 'text-led-amber',
            )}
          >
            <Lightbulb className="size-3.5" />
            {note.used ? 'Использована' : 'Идея'}
          </span>
        )}
      </header>

      {note.text && <p className="mt-2 whitespace-pre-wrap break-words">{note.text}</p>}

      {note.images.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {note.images.map((f) => (
            <a
              key={f}
              href={url(f)}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square overflow-hidden rounded-md bg-groove"
            >
              {token.data && (
                <img
                  src={url(f, '480x0')}
                  alt={displayFileName(f)}
                  loading="lazy"
                  className="size-full object-cover"
                />
              )}
            </a>
          ))}
        </div>
      )}

      {note.audio.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {note.audio.map((f) => (
            <li key={f}>
              <p className="mb-1 truncate text-xs text-dim">{displayFileName(f)}</p>
              {/* biome-ignore lint/a11y/useMediaCaption: черновые записи группы, субтитров нет */}
              <audio controls preload="none" src={url(f)} className="h-10 w-full" />
            </li>
          ))}
        </ul>
      )}

      {(note.kind === 'idea' || mine) && (
        <footer className="mt-2 flex gap-1">
          {note.kind === 'idea' && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => toggleUsed.mutate()}>
              {note.used ? 'Вернуть в идеи' : 'Отметить использованной'}
            </Button>
          )}
          {mine && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-dim"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              <Trash2 data-icon="inline-start" />
              Удалить
            </Button>
          )}
        </footer>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Удалить запись?"
        description="Вместе с ней удалятся приложенные файлы."
        confirm="Удалить"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </article>
  );
}
