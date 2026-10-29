import { ImagePlus, Mic } from 'lucide-react';
import type {
  RefObject,
  ReactNode,
  ComponentProps,
  SyntheticEvent,
  FocusEvent,
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
} from 'react';
import { useId, useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MarkupToolbar } from '@/components/markup-toolbar';
import { useMarkupEditing } from '@/hooks/use-markup-editing';
import { useMentions } from '@/hooks/use-mentions';
import { createNote } from '@/lib/notes';
import { queueNote, flushOutbox } from '@/lib/outbox';
import { useProjectPeople, PeopleKind } from '@/lib/people';
import { pb, getSendVerdict, queryKeys, getErrorText } from '@/shared/api';
import {
  NOTE_DRAFT_PREFIX,
  MAX_IMAGE_FILES,
  MAX_IMAGE_BYTES,
  MAX_AUDIO_FILES,
  MAX_AUDIO_BYTES,
  GROUP,
  IMAGE_ACCEPT,
  AUDIO_ACCEPT,
} from '@/shared/constants';
import { useMe } from '@/shared/hooks';
import type { NoteScope } from '@/shared/types';
import { SendVerdict } from '@/shared/types';
import { Textarea, Progress, Button } from '@/shared/ui';
import {
  getFileSizeLabel,
  shrinkImages,
  getNewRecordId,
  cn,
} from '@/shared/utils';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { ChosenFiles } from './chosen-files';

/** Задержка, с которой прячется панель оформления, когда фокус ушёл из формы */
const TOOLBAR_HIDE_MS = 250;

/** Самый длинный текст заметки */
const NOTE_TEXT_MAX_LENGTH = 10000;

/** Начало MIME-типа картинки */
const IMAGE_MIME_PREFIX = 'image/';

/** Клавиша, которая с Cmd или Ctrl отправляет заметку */
const SUBMIT_KEY = 'Enter';

/** Процентов в целом */
const PERCENT_SCALE = 100;

/** Ошибка отправки без входа в приложение */
const NOT_SIGNED_IN_MESSAGE = 'нет входа';

/** Итог отправки заметки */
enum NoteSendResult {
  /** Заметка на сервере */
  Sent = 'sent',
  /** Заметка в очереди на устройстве */
  Queued = 'queued',
}

/**
 * Файлы после выбора: к уже выбранным добавляются подходящие по размеру, всего не больше max
 *
 * Про слишком большие файлы и лишние сверх max - сообщение с подписью kindLabel
 */
function pickFiles(
  list: Iterable<File>,
  current: File[],
  max: number,
  maxBytes: number,
  kindLabel: string
): File[] {
  const picked = Array.from(list);
  const tooBig = picked.filter((file) => file.size > maxBytes);

  if (tooBig.length > 0) {
    toast.error(
      `${kindLabel}: больше ${getFileSizeLabel(maxBytes)} не загрузить`
    );
  }

  const nextFiles = [
    ...current,
    ...picked.filter((file) => file.size <= maxBytes),
  ];

  if (nextFiles.length > max) {
    toast.error(`${kindLabel}: не больше ${max} в одной заметке`);
  }

  return nextFiles.slice(0, max);
}

/** Ключ черновика заметки: свой у проекта, песни и этапа */
function getDraftKey(scope: NoteScope): string {
  return `${NOTE_DRAFT_PREFIX}${scope.project}.${scope.song ?? ''}.${scope.stage ?? ''}`;
}

/** Черновик заметки с устройства; без хранилища - пусто */
function readDraft(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Недописанный текст заметки переживает закрытие приложения */
function writeDraft(key: string, value: string): void {
  try {
    if (!value) {
      localStorage.removeItem(key);

      return;
    }

    localStorage.setItem(key, value);
  } catch (error) {
    // без хранилища черновик живёт до перезагрузки
    console.error(error);
  }
}

/** Доля в целых процентах */
function getPercent(fraction: number): number {
  return Math.round(fraction * PERCENT_SCALE);
}

/** Пропсы формы новой заметки */
interface NoteComposerProps {
  scope: NoteScope;
}

/** Состояние и обработчики формы новой заметки */
interface UseNoteComposerResult {
  textRef: RefObject<HTMLTextAreaElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  textareaId: string;
  text: string;
  images: File[];
  audio: File[];
  setImages: (files: File[]) => void;
  setAudio: (files: File[]) => void;
  isBusy: boolean;
  hasContent: boolean;
  /** Идёт загрузка файлов: виден прогресс */
  isUploading: boolean;
  progressPercent: number;
  showToolbar: boolean;
  submitLabel: string;
  formClassName: string;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onMarkupAction: ComponentProps<typeof MarkupToolbar>['onAction'];
  onTextSelect: () => void;
  handleSubmit: (event: SyntheticEvent) => void;
  onFormFocus: (event: FocusEvent<HTMLFormElement>) => void;
  onFormBlur: () => void;
  onTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTextPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onImagesInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAudioInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImageClick: () => void;
  onAudioClick: () => void;
}

/** Логика новой заметки: текст и черновик, файлы, отправка или очередь, панель оформления */
function useNoteComposer(scope: NoteScope): UseNoteComposerResult {
  const me = useMe();
  const client = useQueryClient();
  const fieldId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const draftKey = getDraftKey(scope);
  const [text, setText] = useState(() => readDraft(draftKey));
  const updateText = (value: string): void => {
    setText(value);
    writeDraft(draftKey, value);
  };
  const [audio, setAudio] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  // id заметки живёт, пока её содержимое не поменяли: если сервер принял запись, а ответ
  // потерялся (502 на долгой загрузке), повторное нажатие или очередь не создадут вторую
  const noteIdRef = useRef<string | null>(null);

  useEffect(() => {
    noteIdRef.current = null;
  }, [text, audio, images]);

  const hasText = text.trim() !== '';
  const hasFiles = audio.length > 0 || images.length > 0;
  const hasContent = hasText || hasFiles;

  const send = useMutation({
    // без сети заметка не ждёт, а сразу встаёт в очередь
    networkMode: 'always',
    mutationFn: async (): Promise<NoteSendResult> => {
      if (!me) {
        throw new Error(NOT_SIGNED_IN_MESSAGE);
      }

      // фото с телефона уменьшаются до отправки: быстрее грузятся и меньше места в очереди
      const smallImages = await shrinkImages(images);
      noteIdRef.current ??= getNewRecordId();
      const recordId = noteIdRef.current;
      const addToQueue = (): Promise<NoteSendResult> =>
        queueNote({
          id: recordId,
          scope,
          author: me.id,
          text: text.trim(),
          images: smallImages,
          audio,
        }).then(() => NoteSendResult.Queued);

      if (!navigator.onLine) {
        return addToQueue();
      }

      const initialProgress = hasFiles ? 0 : null;
      const onUploadProgress = hasFiles ? setProgress : undefined;
      setProgress(initialProgress);
      try {
        await createNote(
          pb,
          scope,
          me.id,
          { id: recordId, text, audio, images: smallImages },
          onUploadProgress
        );

        return NoteSendResult.Sent;
      } catch (error) {
        // как в очереди: уже на сервере - готово; сеть или сервер недоступны - в очередь
        const verdict = getSendVerdict(error);

        if (verdict === SendVerdict.Sent) {
          return NoteSendResult.Sent;
        }

        if (verdict === SendVerdict.Retry) {
          return addToQueue();
        }

        throw error;
      }
    },
    onSettled: () => {
      setProgress(null);
    },
    onSuccess: async (result) => {
      updateText('');
      setAudio([]);
      setImages([]);

      if (result === NoteSendResult.Queued) {
        toast(
          'Заметка сохранена на устройстве и отправится, когда будет связь с сервером'
        );

        return;
      }

      await client.invalidateQueries({ queryKey: queryKeys.notes.all });
      // связь есть: заодно уходят заметки, ждавшие в очереди
      void flushOutbox(client);
    },
    onError: (error) => {
      toast.error(
        getErrorText(
          error,
          'Заметка не добавлена: сервер не принял её или файлы'
        )
      );
    },
  });
  const isBusy = send.isPending;

  const handleSubmit = (event: SyntheticEvent): void => {
    event.preventDefault();
    const canSend = hasContent && !isBusy;

    if (canSend) {
      send.mutate();
    }
  };

  const markup = useMarkupEditing(textRef, text, updateText);
  const people = useProjectPeople(scope.project, PeopleKind.Active);
  const mentions = useMentions({
    ref: textRef,
    value: text,
    setValue: updateText,
    people,
  });
  // панель оформления видна, пока курсор в поле или в нём есть текст; скрывается с задержкой,
  // чтобы нажатие на её кнопку успело сработать (на телефоне фокус уходит раньше нажатия)
  const [isFocused, setIsFocused] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // снимок экрана вставляется прямо из буфера обмена; адрес поверх выделения - ссылка
  const onTextPaste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    const files = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith(IMAGE_MIME_PREFIX)
    );

    if (files.length === 0) {
      markup.onPaste(event);

      return;
    }

    event.preventDefault();
    setImages(
      pickFiles(files, images, MAX_IMAGE_FILES, MAX_IMAGE_BYTES, 'Картинки')
    );
  };
  const onFormFocus = (event: FocusEvent<HTMLFormElement>): void => {
    clearTimeout(blurTimerRef.current);
    // панель появляется только от курсора в поле: нажатие на "Картинку" или "Аудио" не
    // должно сдвигать кнопки
    const isTextFocused =
      event.target instanceof HTMLTextAreaElement &&
      event.target === textRef.current;

    if (isTextFocused) {
      setIsFocused(true);
    }
  };
  const onFormBlur = (): void => {
    blurTimerRef.current = setTimeout(() => {
      setIsFocused(false);
    }, TOOLBAR_HIDE_MS);
  };
  const onTextChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    updateText(event.target.value);
  };
  const onTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (mentions.onKeyDown(event)) {
      return;
    }

    if (markup.onKeyDown(event)) {
      return;
    }

    const hasModifier = event.metaKey || event.ctrlKey;
    const isSubmitShortcut = event.key === SUBMIT_KEY && hasModifier;

    if (isSubmitShortcut) {
      handleSubmit(event);
    }
  };
  const onImagesInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setImages(
      pickFiles(
        event.target.files ?? [],
        images,
        MAX_IMAGE_FILES,
        MAX_IMAGE_BYTES,
        'Картинки'
      )
    );
    event.target.value = '';
  };
  const onAudioInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setAudio(
      pickFiles(
        event.target.files ?? [],
        audio,
        MAX_AUDIO_FILES,
        MAX_AUDIO_BYTES,
        'Аудио'
      )
    );
    event.target.value = '';
  };
  const onImageClick = (): void => {
    const input = imageInputRef.current;

    if (input) {
      input.click();
    }
  };
  const onAudioClick = (): void => {
    const input = audioInputRef.current;

    if (input) {
      input.click();
    }
  };

  const isUploading = progress !== null;
  const progressPercent = getPercent(progress ?? 0);
  const showUploadPercent = isBusy && isUploading;
  const uploadPercentLabel = `${progressPercent}%`;
  const submitLabel = showUploadPercent ? uploadPercentLabel : 'Добавить';
  const showToolbar = isFocused || text !== '';
  const formClassName = cn(GROUP, 'focus-within:ring-ring/60');
  const textareaId = `${fieldId}-text`;

  return {
    textRef,
    imageInputRef,
    audioInputRef,
    textareaId,
    text,
    images,
    audio,
    setImages,
    setAudio,
    isBusy,
    hasContent,
    isUploading,
    progressPercent,
    showToolbar,
    submitLabel,
    formClassName,
    mentionsMenu: mentions.menu,
    onMarkupAction: markup.onAction,
    onTextSelect: mentions.sync,
    handleSubmit,
    onFormFocus,
    onFormBlur,
    onTextChange,
    onTextPaste,
    onTextKeyDown,
    onImagesInputChange,
    onAudioInputChange,
    onImageClick,
    onAudioClick,
  };
}

/**
 * Новая заметка: текст с оформлением и упоминаниями, картинки и аудио
 *
 * Без сети - в очередь на устройстве (lib/outbox.ts); недописанный текст - черновик в localStorage
 */
export function NoteComposer({ scope }: NoteComposerProps): ReactNode {
  const {
    textRef,
    imageInputRef,
    audioInputRef,
    textareaId,
    text,
    images,
    audio,
    setImages,
    setAudio,
    isBusy,
    hasContent,
    isUploading,
    progressPercent,
    showToolbar,
    submitLabel,
    formClassName,
    mentionsMenu,
    onMarkupAction,
    onTextSelect,
    handleSubmit,
    onFormFocus,
    onFormBlur,
    onTextChange,
    onTextPaste,
    onTextKeyDown,
    onImagesInputChange,
    onAudioInputChange,
    onImageClick,
    onAudioClick,
  } = useNoteComposer(scope);

  return (
    <form
      onSubmit={handleSubmit}
      onFocus={onFormFocus}
      onBlur={onFormBlur}
      className={formClassName}
    >
      <label htmlFor={textareaId} className="sr-only">
        Новая заметка
      </label>
      <Textarea
        ref={textRef}
        id={textareaId}
        rows={1}
        maxLength={NOTE_TEXT_MAX_LENGTH}
        placeholder="Написать заметку"
        value={text}
        disabled={isBusy}
        onChange={onTextChange}
        onPaste={onTextPaste}
        onSelect={onTextSelect}
        onKeyDown={onTextKeyDown}
        className="max-h-80 min-h-12 resize-none rounded-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      {mentionsMenu}
      <ChosenFiles
        images={images}
        audio={audio}
        disabled={isBusy}
        onImagesChange={setImages}
        onAudioChange={setAudio}
      />
      {isUploading && (
        <Progress
          className="mx-4 mb-2 w-auto"
          value={progressPercent}
          aria-label="Загрузка файлов"
        />
      )}
      {showToolbar && (
        <MarkupToolbar
          onAction={onMarkupAction}
          disabled={isBusy}
          className="px-2"
        />
      )}
      <div className="flex items-center gap-0.5 px-1.5 pb-2">
        <input
          ref={imageInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          hidden
          onChange={onImagesInputChange}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept={AUDIO_ACCEPT}
          multiple
          hidden
          onChange={onAudioInputChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={onImageClick}
          className="h-9 text-dim"
        >
          <ImagePlus data-icon="inline-start" />
          Картинка
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={onAudioClick}
          className="h-9 text-dim"
        >
          <Mic data-icon="inline-start" />
          Аудио
        </Button>
        {hasContent && (
          <Button
            type="submit"
            size="sm"
            className="ml-auto h-9 px-3"
            disabled={isBusy}
          >
            {submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
