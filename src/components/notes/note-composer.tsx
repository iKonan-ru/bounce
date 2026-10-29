import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Mic } from 'lucide-react';
import { type ClipboardEvent, type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MarkupToolbar, useMarkupEditing } from '@/components/markup-toolbar';
import { useMentions } from '@/components/mentions';
import { ChosenFiles } from '@/components/notes/chosen-files';
import { GROUP } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useMe } from '@/lib/auth';
import { errorText, sendVerdict } from '@/lib/errors';
import { fileSize } from '@/lib/format';
import { newRecordId } from '@/lib/id';
import { shrinkImages } from '@/lib/images';
import {
  AUDIO_ACCEPT,
  IMAGE_ACCEPT,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_FILES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_FILES,
} from '@/lib/limits';
import { createNote, type NoteScope } from '@/lib/notes';
import { flushOutbox, queueNote } from '@/lib/outbox';
import { pb } from '@/lib/pb';
import { useProjectPeople } from '@/lib/people';
import { queryKeys } from '@/lib/query-keys';
import { NOTE_DRAFT_PREFIX } from '@/lib/text-drafts';
import { cn } from '@/lib/utils';

// задержка, с которой прячется панель оформления, когда фокус ушёл из формы
const TOOLBAR_HIDE_MS = 250;

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

// Новая заметка: текст с оформлением и упоминаниями, картинки и аудио. Без сети - в очередь
// на устройстве (lib/outbox.ts); недописанный текст - черновик в localStorage.
export function NoteComposer({ scope }: { scope: NoteScope }) {
  const me = useMe();
  const client = useQueryClient();
  const id = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const draftKey = `${NOTE_DRAFT_PREFIX}${scope.project}.${scope.song ?? ''}.${scope.stage ?? ''}`;
  const [text, setTextState] = useState(() => readDraft(draftKey));
  const setText = (v: string) => {
    setTextState(v);
    writeDraft(draftKey, v);
  };
  const [audio, setAudio] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  // id заметки живёт, пока её содержимое не поменяли: если сервер принял запись, а ответ
  // потерялся (502 на долгой загрузке), повторное нажатие или очередь не создадут вторую
  const noteId = useRef<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: новое содержимое - новая заметка
  useEffect(() => {
    noteId.current = null;
  }, [text, audio, images]);

  const send = useMutation({
    // без сети заметка не ждёт, а сразу встаёт в очередь
    networkMode: 'always',
    mutationFn: async (): Promise<'sent' | 'queued'> => {
      if (!me) throw new Error('нет входа');
      // фото с телефона уменьшаются до отправки: быстрее грузятся и меньше места в очереди
      const small = await shrinkImages(images);
      noteId.current ??= newRecordId();
      const id = noteId.current;
      const queue = () =>
        queueNote({
          id,
          scope,
          author: me.id,
          text: text.trim(),
          images: small,
          audio,
        }).then(() => 'queued' as const);
      if (!navigator.onLine) return queue();
      const withFiles = audio.length > 0 || images.length > 0;
      setProgress(withFiles ? 0 : null);
      try {
        await createNote(
          pb,
          scope,
          me.id,
          { id, text, audio, images: small },
          withFiles ? setProgress : undefined,
        );
        return 'sent';
      } catch (e) {
        // как в очереди: уже на сервере - готово; сеть или сервер недоступны - в очередь
        const verdict = sendVerdict(e);
        if (verdict === 'sent') return 'sent';
        if (verdict === 'retry') return queue();
        throw e;
      }
    },
    onSettled: () => setProgress(null),
    onSuccess: async (result) => {
      setText('');
      setAudio([]);
      setImages([]);
      if (result === 'queued') {
        toast('Заметка сохранена на устройстве и отправится, когда будет связь с сервером');
        return;
      }
      await client.invalidateQueries({ queryKey: queryKeys.notes.all });
      // связь есть: заодно уходят заметки, ждавшие в очереди
      void flushOutbox(client);
    },
    onError: (e) =>
      toast.error(errorText(e, 'Заметка не добавлена: сервер не принял её или файлы')),
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
    people: useProjectPeople(scope.project, 'active'),
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
        blurTimer.current = setTimeout(() => setFocused(false), TOOLBAR_HIDE_MS);
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
      <ChosenFiles
        images={images}
        audio={audio}
        disabled={busy}
        onImages={setImages}
        onAudio={setAudio}
      />
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
      <div className="flex items-center gap-0.5 px-1.5 pb-2">
        <input
          ref={imageInput}
          type="file"
          accept={IMAGE_ACCEPT}
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
          accept={AUDIO_ACCEPT}
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
