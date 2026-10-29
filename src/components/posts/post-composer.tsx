import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { GROUP } from '@/components/page';
import { TitleComposer } from '@/components/title-composer';
import { errorText } from '@/lib/errors';
import { mentionedIds } from '@/lib/mentions';
import type { Post, Song } from '@/lib/model';
import { pb } from '@/lib/pb';
import { useProjectPeople } from '@/lib/people';
import { createPost } from '@/lib/posts';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

// Новая публикация: только название; остальное - в окне, которое открывается сразу.
export function PostComposer({
  projectId,
  meId,
  song,
  onCreated,
}: {
  projectId: string;
  meId: string;
  // публикация песни: дата - от её релиза (если он есть)
  song?: Song | undefined;
  onCreated: (post: Post) => void;
}) {
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const workers = useProjectPeople(projectId, 'workers');
  const add = useMutation({
    mutationFn: () =>
      createPost(pb, {
        project: projectId,
        title,
        author: meId,
        assignees: mentionedIds(title, workers),
        ...(song ? { song: song.id, anchor: 'release', offset: 0 } : {}),
      }),
    onSuccess: async (post) => {
      setTitle('');
      await client.invalidateQueries({ queryKey: queryKeys.posts.ofProject(projectId) });
      onCreated(post);
    },
    onError: (e) => toast.error(errorText(e, 'Публикация не добавлена: проверьте соединение')),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim() && !add.isPending) add.mutate();
  }
  return (
    <form onSubmit={submit} className={cn(GROUP, 'focus-within:ring-2 focus-within:ring-ring/30')}>
      <TitleComposer
        id={`new-post-${song?.id ?? projectId}`}
        label="Новая публикация"
        value={title}
        onChange={setTitle}
        projectId={projectId}
        busy={add.isPending}
      />
    </form>
  );
}
