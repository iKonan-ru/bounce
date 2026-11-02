/** Пропсы просмотра картинки на весь экран */
export interface ImageViewerProps {
  /** Адрес картинки; без него окно закрыто */
  src: string | undefined;
  title: string;
  /** Адрес исходного файла для скачивания */
  downloadUrl?: string | undefined;
  gallery?: ImageViewerGallery | undefined;
  onClose: () => void;
}

export interface ImageViewerGallery {
  items: {
    id: string;
    src: string | undefined;
    fullSrc: string | undefined;
    title: string;
  }[];
  index: number;
  onSelect: (index: number) => void;
}

export interface ImageViewerTouch {
  x: number;
  y: number;
  isHorizontal: boolean;
}
