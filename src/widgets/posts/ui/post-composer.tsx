import type { ReactNode } from 'react';
import { TitleComposer } from '@/features/mentions';
import { usePostComposer } from '../hooks/use-post-composer';
import type { PostComposerProps } from '../types/post-composer';

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
