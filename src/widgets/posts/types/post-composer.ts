import type { FormEvent } from 'react';
import type { Post } from '@/entities/post';
import type { Song } from '@/entities/song';

/** Пропсы формы новой публикации */
export interface PostComposerProps {
  projectId: string;
  meId: string;
  /** Публикация песни: дата - от её релиза (если он есть) */
  song?: Song | undefined;
  onCreated: (post: Post) => void;
}

/** Состояние и обработчики формы новой публикации */
export interface UsePostComposerResult {
  title: string;
  setTitle: (title: string) => void;
  inputId: string;
  isBusy: boolean;
  formClassName: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
