import type { ChangeEvent, KeyboardEvent } from 'react';
import { useRef } from 'react';
import { toast } from 'sonner';
import type { Post, PostPatch, PostStatus } from '@/entities/post';
import {
  findPostSong,
  updatePost,
  PostAnchor,
  getPostDate,
  getOffsetLabel,
} from '@/entities/post';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import type { Song } from '@/entities/song';
import { songsQuery } from '@/entities/song';
import type { User } from '@/entities/user';
import { useMentions } from '@/features/mentions';
import {
  getErrorText,
  getCollection,
  pb,
  Collections,
  queryKeys,
} from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useDraft } from '@/shared/hooks';
import { getMentionedIds, getDateLabel, cn } from '@/shared/utils';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { NO_SONG, MAX_RELEASE_OFFSET_DAYS } from '../constants/post-dialog';
import type {
  SongOption,
  PostDialogProps,
  UsePostDialogResult,
} from '../types/post-dialog';

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

/** Логика окна публикации: правки полей, текст с упоминаниями и удаление */
export function usePostDialog({
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
