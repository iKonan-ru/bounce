import { Copy, Minus, Pencil, Plus } from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useSongCrumbs } from '@/components/crumbs';
import { Loading } from '@/components/loading';
import { type Crumb, EmptyState, PageHeader } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAccess } from '@/lib/access';
import { useMe } from '@/lib/auth';
import { getErrorText } from '@/lib/errors';
import { checkHasStringField, getField } from '@/lib/guards';
import {
  getLyricsParts,
  getPlainLyrics,
  insertTag,
  LYRICS_TAGS,
  type LyricsPart,
  numberVerses,
} from '@/lib/lyrics';
import type { SongWithStages } from '@/lib/model';
import { Collections, getCollection, pb } from '@/lib/pb';
import { songQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { useStoredChoice } from '@/lib/stored-choice';
import { LYRICS_DRAFT_PREFIX } from '@/lib/text-drafts';
import { cn } from '@/lib/utils';
import { useWakeLock } from '@/lib/wake-lock';
import {
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

/** Id маршрута страницы текста песни */
const LYRICS_ROUTE_ID = '/app/p/$projectId/songs/$songId/lyrics';

/** Ключ хранилища для размера шрифта чтения - удобство этого устройства */
const LYRICS_SIZE_KEY = 'bounce.lyrics-size';

/** Классы размеров шрифта чтения, от мелкого к крупному */
const LYRICS_SIZE_CLASSES: readonly string[] = [
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
];

/** Номер размера шрифта по умолчанию в LYRICS_SIZE_CLASSES */
const DEFAULT_SIZE_INDEX = 1;

/** Номер самого крупного размера шрифта */
const MAX_SIZE_INDEX = LYRICS_SIZE_CLASSES.length - 1;

/** Предел длины текста песни */
const LYRICS_MAX_LENGTH = 50000;

/** Высота поля правки в строках */
const EDITOR_ROWS = 18;

/** Id поля правки текста */
const LYRICS_TEXTAREA_ID = 'lyrics-text';

/**
 * Недописанная правка текста
 *
 * Переживает уход со страницы и закрытие приложения: она лежит на устройстве, пока её не сохранят
 * или не отбросят. Вместе с ней - чья она и с какого текста её начали (base): если текст с тех
 * пор изменили на сервере, человек увидит это до сохранения, а не затрёт чужую правку молча.
 * Выход из приложения стирает черновики (lib/offline.ts)
 */
interface LyricsDraft {
  /** Id автора правки */
  user: string;
  /** Текст, с которого начата правка */
  base: string;
  /** Текст правки */
  draft: string;
}

/** Результат хука страницы текста */
interface UseLyricsResult {
  song: UseQueryResult<SongWithStages>;
  crumbs: Crumb[];
  canEdit: boolean;
  /** Текст песни с сервера */
  text: string;
  parts: LyricsPart[];
  isEditing: boolean;
  draft: string;
  /** Текст читают: правка закрыта и он не пустой */
  isReading: boolean;
  /** Правку начали с текста, который на сервере уже другой */
  isOutdated: boolean;
  isSaving: boolean;
  sizeIndex: number;
  isSmallest: boolean;
  isLargest: boolean;
  shouldShowDraftBanner: boolean;
  /** Текст на сервере изменили после начала сохранённой правки */
  isStoredDraftStale: boolean;
  shouldShowEmpty: boolean;
  isCancelConfirmOpen: boolean;
  setIsCancelConfirmOpen: (isOpen: boolean) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSmallerClick: () => void;
  onLargerClick: () => void;
  onCopyClick: () => Promise<void>;
  onEditClick: () => void;
  onDiscardClick: () => void;
  onCancelClick: () => void;
  onCancelConfirm: () => void;
  onFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDraftChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  handleTagAdd: (tag: string) => void;
}

/** Пропсы кнопок шапки в режиме чтения */
interface ReadingActionsProps {
  canEdit: boolean;
  isSmallest: boolean;
  isLargest: boolean;
  onSmallerClick: () => void;
  onLargerClick: () => void;
  onCopyClick: () => Promise<void>;
  onEditClick: () => void;
}

/** Пропсы плашки сохранённой правки */
interface StoredDraftBannerProps {
  /** Текст на сервере изменили после начала правки */
  isStale: boolean;
  onDiscardClick: () => void;
  onContinueClick: () => void;
}

/** Пропсы текста для чтения */
interface LyricsReaderProps {
  parts: LyricsPart[];
  sizeIndex: number;
}

/** Пропсы части текста */
interface LyricsPartBlockProps {
  part: LyricsPart;
}

/** Пропсы кнопки метки части песни */
interface TagButtonProps {
  tag: string;
  isDisabled: boolean;
  onTagAdd: (tag: string) => void;
}

/** Пропсы формы правки текста */
interface LyricsFormProps {
  draft: string;
  isSaving: boolean;
  isOutdated: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDraftChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTagAdd: (tag: string) => void;
  onCancelClick: () => void;
}

/** Номер размера шрифта из хранилища; неизвестное значение - размер по умолчанию */
function parseSizeIndex(raw: string | null): number {
  const index = Number(raw);
  const isValid = [
    Number.isInteger(index),
    index >= 0,
    index <= MAX_SIZE_INDEX,
  ].every(Boolean);

  if (!isValid) {
    return DEFAULT_SIZE_INDEX;
  }

  return index;
}

/** Ключ хранилища для черновика текста песни */
function getDraftKey(songId: string): string {
  return LYRICS_DRAFT_PREFIX + songId;
}

/** Сохранённая правка текста этого пользователя; нет её - null */
function readLyricsDraft(songId: string, userId: string): LyricsDraft | null {
  try {
    const raw = localStorage.getItem(getDraftKey(songId));

    if (raw === null) {
      return null;
    }

    const stored: unknown = JSON.parse(raw);
    const isOwn = getField(stored, 'user') === userId;
    const hasTexts =
      checkHasStringField(stored, 'base') &&
      checkHasStringField(stored, 'draft');

    if (!isOwn) {
      return null;
    }

    if (!hasTexts) {
      return null;
    }

    return { user: userId, base: stored.base, draft: stored.draft };
  } catch (error) {
    // нет хранилища или запись не разобрать - черновика нет
    console.error(error);
  }

  return null;
}

/** Сохранить правку текста на устройстве; null - стереть */
function writeLyricsDraft(
  songId: string,
  lyricsDraft: LyricsDraft | null
): void {
  try {
    if (lyricsDraft === null) {
      localStorage.removeItem(getDraftKey(songId));

      return;
    }

    localStorage.setItem(getDraftKey(songId), JSON.stringify(lyricsDraft));
  } catch (error) {
    // без хранилища черновик живёт, пока открыта страница
    console.error(error);
  }
}

/** Нажатие на метку не забирает фокус у поля: курсор остаётся на месте */
function preventFocusLoss(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
}

/** Страница пересоздаётся при смене песни: иначе черновик одной песни попал бы в другую */
export function LyricsPage(): ReactNode {
  const { songId } = useParams({ from: LYRICS_ROUTE_ID });

  return <Lyrics key={songId} />;
}

/** Состояние и обработчики страницы текста: чтение, правка и черновик на устройстве */
function useLyrics(): UseLyricsResult {
  const { projectId, songId } = useParams({ from: LYRICS_ROUTE_ID });
  const meId = useMe()?.id ?? '';
  const queryClient = useQueryClient();
  const song = useQuery(songQuery(songId));
  const crumbs = useSongCrumbs(projectId, songId);
  const access = useAccess(projectId);
  const text = song.data?.lyrics ?? '';
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  // с какого текста начата правка: если он на сервере уже другой - предупреждение
  const [base, setBase] = useState('');
  const [sizeIndex, setSizeIndex] = useStoredChoice(
    LYRICS_SIZE_KEY,
    parseSizeIndex,
    DEFAULT_SIZE_INDEX
  );
  // черновик с прошлого раза, пока его не открыли и не отбросили
  const [storedDraft, setStoredDraft] = useState(() =>
    readLyricsDraft(songId, meId)
  );
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // куда поставить курсор после вставки метки: сразу после отрисовки нового текста
  const caretRef = useRef<number | null>(null);

  const isChanged = isEditing && draft !== text;
  const isOutdated = isEditing && base !== text;
  const isReading = !isEditing && text !== '';
  const isStoredDraftStale = storedDraft !== null && storedDraft.base !== text;
  const shouldShowDraftBanner = [
    access.canEdit,
    !isEditing,
    storedDraft !== null,
    storedDraft?.draft !== text,
  ].every(Boolean);
  const shouldShowEmpty = [song.isSuccess, !isEditing, !text].every(Boolean);
  const parts = numberVerses(getLyricsParts(text));

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    if (draft === text) {
      writeLyricsDraft(songId, null);

      return;
    }

    writeLyricsDraft(songId, { user: meId, base, draft });
  }, [isEditing, draft, text, songId, meId, base]);

  // сохранённый черновик совпал с текстом (сохранение прошло, а ответ потерялся) - он не нужен
  useEffect(() => {
    if (!storedDraft) {
      return;
    }

    const isSaved = song.isSuccess && storedDraft.draft === text;

    if (isSaved) {
      writeLyricsDraft(songId, null);
      setStoredDraft(null);
    }
  }, [storedDraft, song.isSuccess, text, songId]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const caret = caretRef.current;

    if (!textarea || caret === null) {
      return;
    }

    if (textarea.value !== draft) {
      return;
    }

    textarea.focus();
    textarea.setSelectionRange(caret, caret);
    caretRef.current = null;
  }, [draft]);

  // экран не гаснет, пока текст открыт для чтения
  useWakeLock(isReading);

  const handleDraftDiscard = (): void => {
    writeLyricsDraft(songId, null);
    setStoredDraft(null);
  };

  const saveLyrics = useMutation({
    mutationFn: (lyrics: string) =>
      getCollection(pb, Collections.Songs).update(songId, { lyrics }),
    onSuccess: async () => {
      setIsEditing(false);
      handleDraftDiscard();
      await queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
    },
    onError: (error) =>
      toast.error(
        getErrorText(error, 'Текст не сохранён: проверьте соединение')
      ),
  });

  const onEditClick = (): void => {
    const saved = readLyricsDraft(songId, meId);
    setDraft(saved?.draft ?? text);
    setBase(saved?.base ?? text);
    setStoredDraft(null);
    setIsEditing(true);
  };

  const onCancelClick = (): void => {
    if (isChanged) {
      setIsCancelConfirmOpen(true);

      return;
    }

    handleDraftDiscard();
    setIsEditing(false);
  };

  const onCancelConfirm = (): void => {
    setIsCancelConfirmOpen(false);
    handleDraftDiscard();
    setIsEditing(false);
  };

  const onDiscardClick = (): void => {
    handleDraftDiscard();
  };

  const onSmallerClick = (): void => {
    setSizeIndex(sizeIndex - 1);
  };

  const onLargerClick = (): void => {
    setSizeIndex(sizeIndex + 1);
  };

  // метка части - на месте курсора; фокус остаётся в поле, чтобы сразу писать дальше
  const handleTagAdd = (tag: string): void => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? draft.length;
    const end = textarea?.selectionEnd ?? draft.length;
    const next = insertTag({ value: draft, start, end }, tag);
    caretRef.current = next.start;
    setDraft(next.value);
  };

  const onCopyClick = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(getPlainLyrics(text));
      toast.success('Текст скопирован');
    } catch (error) {
      console.error(error);
      toast.error('Не удалось скопировать');
    }
  };

  const onFormSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (draft === text) {
      setIsEditing(false);

      return;
    }

    saveLyrics.mutate(draft);
  };

  const onDraftChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setDraft(event.target.value);
  };

  return {
    song,
    crumbs,
    canEdit: access.canEdit,
    text,
    parts,
    isEditing,
    draft,
    isReading,
    isOutdated,
    isSaving: saveLyrics.isPending,
    sizeIndex,
    isSmallest: sizeIndex === 0,
    isLargest: sizeIndex === MAX_SIZE_INDEX,
    shouldShowDraftBanner,
    isStoredDraftStale,
    shouldShowEmpty,
    isCancelConfirmOpen,
    setIsCancelConfirmOpen,
    textareaRef,
    onSmallerClick,
    onLargerClick,
    onCopyClick,
    onEditClick,
    onDiscardClick,
    onCancelClick,
    onCancelConfirm,
    onFormSubmit,
    onDraftChange,
    handleTagAdd,
  };
}

/** Текст песни: чтение, правка с метками частей и черновик на устройстве */
function Lyrics(): ReactNode {
  const {
    song,
    crumbs,
    canEdit,
    parts,
    isEditing,
    draft,
    isReading,
    isOutdated,
    isSaving,
    sizeIndex,
    isSmallest,
    isLargest,
    shouldShowDraftBanner,
    isStoredDraftStale,
    shouldShowEmpty,
    isCancelConfirmOpen,
    setIsCancelConfirmOpen,
    textareaRef,
    onSmallerClick,
    onLargerClick,
    onCopyClick,
    onEditClick,
    onDiscardClick,
    onCancelClick,
    onCancelConfirm,
    onFormSubmit,
    onDraftChange,
    handleTagAdd,
  } = useLyrics();

  const headerActions = isReading && (
    <ReadingActions
      canEdit={canEdit}
      isSmallest={isSmallest}
      isLargest={isLargest}
      onSmallerClick={onSmallerClick}
      onLargerClick={onLargerClick}
      onCopyClick={onCopyClick}
      onEditClick={onEditClick}
    />
  );
  const emptyAction = canEdit && (
    <Button variant="secondary" onClick={onEditClick}>
      <Pencil data-icon="inline-start" />
      Написать текст
    </Button>
  );

  return (
    <>
      <PageHeader crumbs={crumbs} title="Текст песни" actions={headerActions} />
      {song.isPending && <Loading className="h-60 rounded-xl" />}

      {shouldShowDraftBanner && (
        <StoredDraftBanner
          isStale={isStoredDraftStale}
          onDiscardClick={onDiscardClick}
          onContinueClick={onEditClick}
        />
      )}

      {shouldShowEmpty && (
        <EmptyState action={emptyAction}>Текста пока нет</EmptyState>
      )}

      {isReading && <LyricsReader parts={parts} sizeIndex={sizeIndex} />}

      {isEditing && (
        <LyricsForm
          draft={draft}
          isSaving={isSaving}
          isOutdated={isOutdated}
          textareaRef={textareaRef}
          onFormSubmit={onFormSubmit}
          onDraftChange={onDraftChange}
          onTagAdd={handleTagAdd}
          onCancelClick={onCancelClick}
        />
      )}
      <ConfirmDialog
        open={isCancelConfirmOpen}
        onOpenChange={setIsCancelConfirmOpen}
        title="Отменить правки?"
        description="Изменения в тексте пропадут."
        confirmLabel="Отменить правки"
        onConfirm={onCancelConfirm}
      />
    </>
  );
}

/** Кнопки шапки в режиме чтения: размер шрифта, копирование, правка */
function ReadingActions({
  canEdit,
  isSmallest,
  isLargest,
  onSmallerClick,
  onLargerClick,
  onCopyClick,
  onEditClick,
}: ReadingActionsProps): ReactNode {
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Мельче"
        disabled={isSmallest}
        onClick={onSmallerClick}
      >
        <Minus />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Крупнее"
        disabled={isLargest}
        onClick={onLargerClick}
      >
        <Plus />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Скопировать текст без меток"
        title="Скопировать текст без меток"
        onClick={onCopyClick}
      >
        <Copy />
      </Button>
      {canEdit && (
        <>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Изменить"
            className="sm:hidden"
            onClick={onEditClick}
          >
            <Pencil />
          </Button>
          <Button
            variant="secondary"
            className="max-sm:hidden"
            onClick={onEditClick}
          >
            <Pencil data-icon="inline-start" />
            Изменить
          </Button>
        </>
      )}
    </>
  );
}

/** Плашка о несохранённой правке текста с прошлого раза */
function StoredDraftBanner({
  isStale,
  onDiscardClick,
  onContinueClick,
}: StoredDraftBannerProps): ReactNode {
  return (
    <div className="mb-4 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-panel px-4 py-3 text-sm ring-1 ring-border/70 dark:ring-border/40">
      <span className="flex-1">
        Есть несохранённая правка текста.
        {isStale && ' Текст с тех пор изменили.'}
      </span>
      <Button size="sm" variant="ghost" onClick={onDiscardClick}>
        Отбросить
      </Button>
      <Button size="sm" variant="secondary" onClick={onContinueClick}>
        <Pencil data-icon="inline-start" />
        Продолжить
      </Button>
    </div>
  );
}

/** Текст песни для чтения: части по порядку, шрифт выбранного размера */
function LyricsReader({ parts, sizeIndex }: LyricsReaderProps): ReactNode {
  const readerClassName = cn(
    'flex max-w-3xl flex-col gap-6 leading-relaxed',
    LYRICS_SIZE_CLASSES[sizeIndex]
  );

  return (
    <div className={readerClassName}>
      {parts.map((part, index) => {
        // номер в ключе допустим: части текста идут по порядку, их не переставляют
        const partKey = `${part.title}-${index}`;

        return <LyricsPartBlock key={partKey} part={part} />;
      })}
    </div>
  );
}

/** Часть текста: заголовок и строки */
function LyricsPartBlock({ part }: LyricsPartBlockProps): ReactNode {
  const lines = part.lines.join('\n');

  return (
    <div>
      {part.title && (
        <p className="mb-1 text-sm font-medium text-dim">{part.title}</p>
      )}
      <p className="whitespace-pre-wrap">{lines}</p>
    </div>
  );
}

/** Кнопка метки части песни: вставляет её на место курсора */
function TagButton({ tag, isDisabled, onTagAdd }: TagButtonProps): ReactNode {
  const onTagClick = (): void => {
    onTagAdd(tag);
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      // нажатие не забирает фокус у поля: курсор остаётся на месте
      onMouseDown={preventFocusLoss}
      onClick={onTagClick}
      className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-panel px-3 text-sm ring-1 ring-border/70 transition-colors hover:bg-groove active:bg-groove md:h-8 dark:ring-border/40"
    >
      <Plus className="size-3.5 text-dim" />
      {tag}
    </button>
  );
}

/** Форма правки текста: метки частей, поле и кнопки */
function LyricsForm({
  draft,
  isSaving,
  isOutdated,
  textareaRef,
  onFormSubmit,
  onDraftChange,
  onTagAdd,
  onCancelClick,
}: LyricsFormProps): ReactNode {
  return (
    <form className="flex max-w-3xl flex-col gap-3" onSubmit={onFormSubmit}>
      <div
        role="toolbar"
        aria-label="Части песни"
        className="sticky top-0 z-10 -mx-4 flex gap-1.5 overflow-x-auto bg-console/95 px-4 py-2 backdrop-blur sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]"
      >
        {LYRICS_TAGS.map((tag) => (
          <TagButton
            key={tag}
            tag={tag}
            isDisabled={isSaving}
            onTagAdd={onTagAdd}
          />
        ))}
      </div>
      {isOutdated && (
        <p className="text-sm text-led-amber">
          Пока шла эта правка, текст песни изменили. Сохранение заменит новую
          версию.
        </p>
      )}
      <label htmlFor={LYRICS_TEXTAREA_ID} className="sr-only">
        Текст песни
      </label>
      <Textarea
        ref={textareaRef}
        id={LYRICS_TEXTAREA_ID}
        autoFocus
        rows={EDITOR_ROWS}
        maxLength={LYRICS_MAX_LENGTH}
        placeholder={'[Куплет]\n...\n\n[Припев]\n...'}
        value={draft}
        disabled={isSaving}
        onChange={onDraftChange}
        className="min-h-[55dvh] leading-relaxed"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={isSaving}
          onClick={onCancelClick}
        >
          Отмена
        </Button>
        <Button type="submit" disabled={isSaving}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}
