/** Пропсы просмотра картинки на весь экран */
export interface ImageViewerProps {
  /** Адрес картинки; без него окно закрыто */
  src: string | undefined;
  title: string;
  /** Адрес исходного файла для скачивания */
  downloadUrl?: string | undefined;
  onClose: () => void;
}
