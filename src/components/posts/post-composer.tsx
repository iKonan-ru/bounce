import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { TitleComposer } from '@/components/title-composer';
import type { NewPost, Post } from '@/entities/post';
import { PostAnchor, createPost } from '@/entities/post';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import type { Song } from '@/entities/song';
import { pb, queryKeys, getErrorText } from '@/shared/api';
import { GROUP } from '@/shared/constants';
import { getMentionedIds, cn } from '@/shared/utils';
import { useQueryClient, useMutation } from '@tanstack/react-query';

/** Сдвиг от релиза у новой публикации песни: в день релиза */
const RELEASE_DAY_OFFSET = 0;

/** Публикация песни: дата - от её релиза; без песни - как есть */
function attachToSong(post: NewPost, song: Song | undefined): NewPost {
  if (!song) {
    return post;
  }

  return {
    ...post,
    song: song.id,
    anchor: PostAnchor.release,
    offset: RELEASE_DAY_OFFSET,
  };
}

/** Пропсы формы новой публикации */
interface PostComposerProps {
  projectId: string;
  meId: string;
  /** Публикация песни: дата - от её релиза (если он есть) */
  song?: Song | undefined;
  onCreated: (post: Post) => void;
}

/** Состояние и обработчики формы новой публикации */
interface UsePostComposerResult {
  title: string;
  setTitle: (title: string) => void;
  inputId: string;
  isBusy: boolean;
  formClassName: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/** Логика новой публикации: название, исполнители из упоминаний и создание */
function usePostComposer({
  projectId,
  meId,
  song,
  onCreated,
}: PostComposerProps): UsePostComposerResult {
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const workers = useProjectPeople(projectId, PeopleKind.Workers);
  const add = useMutation({
    mutationFn: () => {
      const newPost: NewPost = {
        project: projectId,
        title,
        author: meId,
        assignees: getMentionedIds(title, workers),
      };

      return createPost(pb, attachToSong(newPost, song));
    },
    onSuccess: async (post) => {
      setTitle('');
      await client.invalidateQueries({
        queryKey: queryKeys.posts.ofProject(projectId),
      });
      onCreated(post);
    },
    onError: (error) => {
      toast.error(
        getErrorText(error, 'Публикация не добавлена: проверьте соединение')
      );
    },
  });
  const isBusy = add.isPending;
  const hasTitle = title.trim() !== '';
  const formClassName = cn(
    GROUP,
    'focus-within:ring-2 focus-within:ring-ring/30'
  );
  const inputId = `new-post-${song?.id ?? projectId}`;

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const canAdd = hasTitle && !isBusy;

    if (canAdd) {
      add.mutate();
    }
  };

  return { title, setTitle, inputId, isBusy, formClassName, onSubmit };
}

/** Новая публикация: только название; остальное - в окне, которое открывается сразу */
export function PostComposer({
  projectId,
  meId,
  song,
  onCreated,
}: PostComposerProps): ReactNode {
  const { title, setTitle, inputId, isBusy, formClassName, onSubmit } =
    usePostComposer({
      projectId,
      meId,
      song,
      onCreated,
    });

  return (
    <form onSubmit={onSubmit} className={formClassName}>
      <TitleComposer
        id={inputId}
        label="Новая публикация"
        value={title}
        onChange={setTitle}
        projectId={projectId}
        isBusy={isBusy}
      />
    </form>
  );
}
