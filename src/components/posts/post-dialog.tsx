import { Minus, Plus } from 'lucide-react';
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useRef,
} from 'react';
import { toast } from 'sonner';
import { DateField } from '@/components/date-field';
import { EditableTitle } from '@/components/editable-title';
import { ItemDialogFooter } from '@/components/item-dialog-footer';
import { useMentions } from '@/components/mentions';
import { MenuSelect } from '@/components/menu-select';
import { GROUP_ROWS } from '@/components/page';
import { PeoplePicker } from '@/components/people-picker';
import { PlatformToggles } from '@/components/platform-toggles';
import { findPostSong, PostStatusDot } from '@/components/posts/post-row';
import { PropRow } from '@/components/prop-row';
import { Segmented } from '@/components/segmented';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useDraft } from '@/lib/draft';
import { getErrorText, SAVE_FAILED } from '@/lib/errors';
import { getDateLabel } from '@/lib/format';
import { getMentionedIds } from '@/lib/mentions';
import {
  type Post,
  PostAnchor,
  type PostStatus,
  type Song,
  type User,
} from '@/lib/model';
import { Collections, getCollection, pb } from '@/lib/pb';
import { PeopleKind, useProjectPeople } from '@/lib/people';
import {
  getOffsetLabel,
  getPostDate,
  type PostPatch,
  updatePost,
} from '@/lib/posts';
import { songsQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { POST_STATUS_LABEL, POST_STATUSES } from '@/lib/statuses';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** Значение "Без песни" в выборе песни */
const NO_SONG = 'none';

/** Самый длинный текст поста */
const POST_TEXT_MAX_LENGTH = 10000;

/** Самый большой сдвиг от релиза в днях, в обе стороны */
const MAX_RELEASE_OFFSET_DAYS = 365;

/** Вариант выбора: значение и подпись */
interface ChoiceOption<Value extends string> {
  value: Value;
  label: string;
}

/** Вариант выбора песни */
interface SongOption extends ChoiceOption<string> {
  /** Отделён чертой от вариантов выше */
  separated?: boolean;
}

/** Варианты статуса публикации */
const STATUS_OPTIONS: readonly ChoiceOption<PostStatus>[] = POST_STATUSES.map(
  (status) => ({
    value: status,
    label: POST_STATUS_LABEL[status],
  })
);

/** Варианты отсчёта даты публикации песни */
const ANCHOR_OPTIONS: readonly ChoiceOption<PostAnchor>[] = [
  { value: PostAnchor.release, label: 'От релиза' },
  { value: PostAnchor.date, label: 'Своя дата' },
];

/** Правка с исполнителями: новые упомянутые в тексте - исполнители */
function getMentionPatch(
  post: Post,
  text: string,
  workers: readonly User[]
): PostPatch {
  const current = post.assignees ?? [];
  const added = getMentionedIds(text, workers).filter(
    (id) => !current.includes(id)
  );

  if (added.length === 0) {
    return {};
  }

  return { assignees: [...current, ...added] };
}

/** Варианты выбора песни: песни проекта и "Без песни" */
function getSongOptions(songs: readonly Song[]): SongOption[] {
  const songOptions = songs.map((song) => ({
    value: song.id,
    label: song.title,
  }));

  return [
    ...songOptions,
    { value: NO_SONG, label: 'Без песни', separated: songs.length > 0 },
  ];
}

/** Пропсы окна публикации */
interface PostDialogProps {
  post: Post;
  canWork: boolean;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Состояние и обработчики окна публикации */
interface UsePostDialogResult {
  song: Song | undefined;
  songValue: string;
  songOptions: SongOption[];
  platforms: string[];
  assignees: string[];
  /** Дата публикации, если она своя (не от релиза) */
  postDate: string;
  /** Дата публикации от релиза словами или "нет даты релиза" */
  releaseDateText: string;
  releaseDateClassName: string;
  /** Дата считается от релиза песни */
  isFromRelease: boolean;
  anchorValue: PostAnchor;
  offsetLabel: string;
  isEarlierDisabled: boolean;
  isLaterDisabled: boolean;
  isDeleting: boolean;
  textRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  /** Список упоминаний под полем текста */
  mentionsMenu: ReactNode;
  onTitleCommit: (title: string) => void;
  onStatusChange: (status: PostStatus) => void;
  onPlatformToggle: (id: string, isSelected: boolean) => void;
  onSongChange: (songId: string) => void;
  onAnchorChange: (anchor: PostAnchor) => void;
  onEarlierClick: () => void;
  onLaterClick: () => void;
  onDateChange: (date: string) => void;
  onAssigneesChange: (assignees: string[]) => void;
  onTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTextSelect: () => void;
  onTextFocus: () => void;
  onTextBlur: () => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onDeleteClick: () => void;
  onDoneClick: () => void;
}

/** Логика окна публикации: правки полей, текст с упоминаниями и удаление */
function usePostDialog({
  post,
  canWork,
  onOpenChange,
}: Omit<PostDialogProps, 'open'>): UsePostDialogResult {
  const client = useQueryClient();
  const songs = useQuery(songsQuery(post.project));
  const songList = songs.data ?? [];
  const song = findPostSong(post, songList);
  const people = useProjectPeople(post.project, PeopleKind.Active);
  const workers = useProjectPeople(post.project, PeopleKind.Workers);
  const {
    draft: text,
    setDraft: setText,
    start: startText,
    finish: finishText,
  } = useDraft(post.text ?? '');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const textMentions = useMentions({
    ref: textRef,
    value: text,
    setValue: setText,
    people,
  });

  const savePatch = (patch: PostPatch): void => {
    void updatePost(client, post, patch).catch((error) => {
      toast.error(getErrorText(error, SAVE_FAILED));
    });
  };
  const remove = useMutation({
    mutationFn: () => getCollection(pb, Collections.Posts).delete(post.id),
    onSuccess: async () => {
      onOpenChange(false);
      await client.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
    onError: (error) => {
      toast.error(
        getErrorText(error, 'Публикация не удалена: проверьте соединение')
      );
    },
  });
  const platforms = post.platforms ?? [];
  const isFromRelease = post.anchor === PostAnchor.release && Boolean(song);
  const anchorValue = isFromRelease ? PostAnchor.release : PostAnchor.date;
  const date = getPostDate(post, songList);
  const dateLabel = getDateLabel(date);
  const releaseDateText = date ? dateLabel : 'нет даты релиза';
  const releaseDateClassName = cn('px-2 text-sm', { 'text-dim': !date });
  const offset = post.offset ?? 0;
  const isEarlierDisabled = !canWork || offset <= -MAX_RELEASE_OFFSET_DAYS;
  const isLaterDisabled = !canWork || offset >= MAX_RELEASE_OFFSET_DAYS;

  const onTitleCommit = (title: string): void => {
    savePatch({ title, ...getMentionPatch(post, title, workers) });
  };
  const onTextBlur = (): void => {
    const wasEdited = finishText();
    const isChanged = text !== (post.text ?? '');

    if (wasEdited && isChanged) {
      savePatch({ text, ...getMentionPatch(post, text, workers) });
    }
  };
  const onPlatformToggle = (id: string, isSelected: boolean): void => {
    if (isSelected) {
      savePatch({
        platforms: platforms.filter((platformId) => platformId !== id),
      });

      return;
    }

    savePatch({ platforms: [...platforms, id] });
  };
  const onStatusChange = (status: PostStatus): void => {
    if (canWork) {
      savePatch({ status });
    }
  };
  const onSongChange = (songId: string): void => {
    if (songId === NO_SONG) {
      savePatch({ song: '', anchor: PostAnchor.date, date });

      return;
    }

    savePatch({ song: songId });
  };
  const onAnchorChange = (anchor: PostAnchor): void => {
    if (!canWork) {
      return;
    }

    if (anchor === PostAnchor.release) {
      savePatch({ anchor: PostAnchor.release });

      return;
    }

    savePatch({ anchor: PostAnchor.date, date });
  };
  const onEarlierClick = (): void => {
    savePatch({ offset: offset - 1 });
  };
  const onLaterClick = (): void => {
    savePatch({ offset: offset + 1 });
  };
  const onDateChange = (nextDate: string): void => {
    savePatch({ date: nextDate });
  };
  const onAssigneesChange = (assignees: string[]): void => {
    savePatch({ assignees });
  };
  const onTextChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setText(event.target.value);
  };
  const onTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    textMentions.onKeyDown(event);
  };
  const onDeleteClick = (): void => {
    remove.mutate();
  };
  const onDoneClick = (): void => {
    onOpenChange(false);
  };

  return {
    song,
    songValue: post.song || NO_SONG,
    songOptions: getSongOptions(songList),
    platforms,
    assignees: post.assignees ?? [],
    postDate: post.date ?? '',
    releaseDateText,
    releaseDateClassName,
    isFromRelease,
    anchorValue,
    offsetLabel: getOffsetLabel(offset),
    isEarlierDisabled,
    isLaterDisabled,
    isDeleting: remove.isPending,
    textRef,
    text,
    mentionsMenu: textMentions.menu,
    onTitleCommit,
    onStatusChange,
    onPlatformToggle,
    onSongChange,
    onAnchorChange,
    onEarlierClick,
    onLaterClick,
    onDateChange,
    onAssigneesChange,
    onTextChange,
    onTextSelect: textMentions.sync,
    onTextFocus: startText,
    onTextBlur,
    onTextKeyDown,
    onDeleteClick,
    onDoneClick,
  };
}

/** Публикация целиком: что, где, когда (дата или от релиза), кто, текст поста */
export function PostDialog({
  post,
  canWork,
  open,
  onOpenChange,
}: PostDialogProps): ReactNode {
  const {
    song,
    songValue,
    songOptions,
    platforms,
    assignees,
    postDate,
    releaseDateText,
    releaseDateClassName,
    isFromRelease,
    anchorValue,
    offsetLabel,
    isEarlierDisabled,
    isLaterDisabled,
    isDeleting,
    textRef,
    text,
    mentionsMenu,
    onTitleCommit,
    onStatusChange,
    onPlatformToggle,
    onSongChange,
    onAnchorChange,
    onEarlierClick,
    onLaterClick,
    onDateChange,
    onAssigneesChange,
    onTextChange,
    onTextSelect,
    onTextFocus,
    onTextBlur,
    onTextKeyDown,
    onDeleteClick,
    onDoneClick,
  } = usePostDialog({ post, canWork, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle className="sr-only">Публикация</DialogTitle>
          <div className="flex items-start gap-2 pr-8">
            <span className="flex size-8 shrink-0 items-center justify-center">
              <PostStatusDot post={post} />
            </span>
            <EditableTitle
              id="post-title"
              label="Что публикуем"
              value={post.title}
              projectId={post.project}
              disabled={!canWork}
              onCommit={onTitleCommit}
            />
          </div>
        </DialogHeader>

        <Segmented
          label="Статус"
          options={STATUS_OPTIONS}
          value={post.status}
          onChange={onStatusChange}
          disabled={!canWork}
          // на телефоне четыре статуса не влезают в строку: два ряда
          className="grid grid-cols-2 ring-1 ring-border/70 sm:flex dark:ring-border/40"
        />

        <fieldset className="flex flex-wrap gap-1.5" disabled={!canWork}>
          <legend className="sr-only">Площадки</legend>
          <PlatformToggles value={platforms} onToggle={onPlatformToggle} />
        </fieldset>

        <div className={GROUP_ROWS}>
          <PropRow label="Песня">
            <MenuSelect
              label="Песня"
              value={songValue}
              isDim={!song}
              disabled={!canWork}
              onChange={onSongChange}
              options={songOptions}
            />
          </PropRow>
          {song && (
            <div className="px-4 py-3">
              <Segmented
                label="Когда"
                options={ANCHOR_OPTIONS}
                value={anchorValue}
                disabled={!canWork}
                onChange={onAnchorChange}
                className="bg-console/60 dark:bg-black/15"
              />
            </div>
          )}
          {isFromRelease ? (
            <PropRow label="Когда">
              <span className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="На день раньше"
                  disabled={isEarlierDisabled}
                  onClick={onEarlierClick}
                >
                  <Minus />
                </Button>
                <span className="min-w-36 text-center text-sm whitespace-nowrap">
                  {offsetLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="На день позже"
                  className="-mr-2"
                  disabled={isLaterDisabled}
                  onClick={onLaterClick}
                >
                  <Plus />
                </Button>
              </span>
            </PropRow>
          ) : (
            <PropRow label="Дата">
              <DateField
                isQuiet
                disabled={!canWork}
                value={postDate}
                placeholder="Без даты"
                onChange={onDateChange}
              />
            </PropRow>
          )}
          {isFromRelease && (
            <PropRow label="Выходит">
              <span className={releaseDateClassName}>{releaseDateText}</span>
            </PropRow>
          )}
          <PropRow label="Кто делает">
            <PeoplePicker
              projectId={post.project}
              value={assignees}
              disabled={!canWork}
              onChange={onAssigneesChange}
            />
          </PropRow>
        </div>

        <div className="relative">
          <label htmlFor="post-text" className="sr-only">
            Текст поста
          </label>
          <Textarea
            ref={textRef}
            id="post-text"
            rows={3}
            maxLength={POST_TEXT_MAX_LENGTH}
            disabled={!canWork}
            placeholder="Текст поста, идеи, хэштеги"
            value={text}
            onChange={onTextChange}
            onSelect={onTextSelect}
            onFocus={onTextFocus}
            onBlur={onTextBlur}
            onKeyDown={onTextKeyDown}
            className="min-h-24"
          />
          {mentionsMenu}
        </div>

        <ItemDialogFooter
          canWork={canWork}
          title={post.title}
          isDeleting={isDeleting}
          onDelete={onDeleteClick}
          onDone={onDoneClick}
        />
      </DialogContent>
    </Dialog>
  );
}
