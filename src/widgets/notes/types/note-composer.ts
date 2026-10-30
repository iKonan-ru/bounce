import type {
  RefObject,
  ReactNode,
  ComponentProps,
  SyntheticEvent,
  FocusEvent,
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
} from 'react';
import type { MarkupToolbar } from '@/features/markup';
import type { NoteScope } from '@/shared/types';

/** Итог отправки заметки */
export enum NoteSendResult {
  /** Заметка на сервере */
  Sent = 'sent',
  /** Заметка в очереди на устройстве */
  Queued = 'queued',
}

/** Пропсы формы новой заметки */
export interface NoteComposerProps {
  scope: NoteScope;
}

/** Состояние и обработчики формы новой заметки */
export interface UseNoteComposerResult {
  textRef: RefObject<HTMLTextAreaElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  textareaId: string;
  text: string;
  images: File[];
  audio: File[];
  setImages: (files: File[]) => void;
  setAudio: (files: File[]) => void;
  isBusy: boolean;
  hasContent: boolean;
  /** Идёт загрузка файлов: виден прогресс */
  isUploading: boolean;
  progressPercent: number;
  showToolbar: boolean;
  submitLabel: string;
  formClassName: string;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onMarkupAction: ComponentProps<typeof MarkupToolbar>['onAction'];
  onTextSelect: () => void;
  handleSubmit: (event: SyntheticEvent) => void;
  onFormFocus: (event: FocusEvent<HTMLFormElement>) => void;
  onFormBlur: () => void;
  onTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTextPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onFilesDrop: (files: File[]) => void;
  onImagesInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAudioInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImageClick: () => void;
  onAudioClick: () => void;
}
