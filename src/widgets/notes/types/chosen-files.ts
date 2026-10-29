/** Пропсы выбранного файла в списке */
export interface ChosenFileProps {
  file: File;
  /** Номер файла в списке files */
  index: number;
  /** Весь список, из которого файл убирается */
  files: File[];
  disabled: boolean;
  onFilesChange: (files: File[]) => void;
}

/** Пропсы выбранных для новой заметки файлов */
export interface ChosenFilesProps {
  images: File[];
  audio: File[];
  disabled: boolean;
  onImagesChange: (files: File[]) => void;
  onAudioChange: (files: File[]) => void;
}

/** Пропсы кнопки "убрать" поверх превью */
export interface RemoveButtonProps {
  /** Подпись для экранного диктора */
  label: string;
  onClick: () => void;
  disabled?: boolean;
}
