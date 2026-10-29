import type { FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { NewPost } from '@/entities/post';
import { PostAnchor, createPost } from '@/entities/post';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import type { Song } from '@/entities/song';
import { pb, queryKeys, getErrorText } from '@/shared/api';
import { GROUP } from '@/shared/constants';
import { getMentionedIds, cn } from '@/shared/utils';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { RELEASE_DAY_OFFSET } from '../constants/post-composer';
import type {
  PostComposerProps,
  UsePostComposerResult,
} from '../types/post-composer';

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

/** Логика новой публикации: название, исполнители из упоминаний и создание */
export function usePostComposer({
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
