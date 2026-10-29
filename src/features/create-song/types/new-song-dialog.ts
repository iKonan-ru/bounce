import type { FormEvent, ChangeEvent } from 'react';

/** Пропсы окна новой песни */
export interface NewSongDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Состояние и действия окна новой песни */
export interface UseNewSongDialogResult {
  title: string;
  /** Кнопка "Создать" недоступна: нет названия, песня создаётся или шаблон ещё грузится */
  isSubmitDisabled: boolean;
  onSubmit: (event: FormEvent) => void;
  onTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCancelClick: () => void;
}
