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
  label = 'Новая публикация',
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
        label={label}
        value={title}
        onChange={setTitle}
        projectId={projectId}
        isBusy={isBusy}
      />
    </form>
  );
}
