/** Пропсы подвала окна задачи или публикации */
export interface ItemDialogFooterProps {
  /** Можно править: есть кнопка "Удалить" */
  canWork: boolean;
  /** Название в вопросе "Удалить ...?" */
  title: string;
  /** Удаление выполняется */
  isDeleting: boolean;
  onDelete: () => void;
  onDone: () => void;
}
