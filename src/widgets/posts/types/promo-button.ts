import type { Song } from '@/entities/song';

/** Пропсы кнопки промо-плана */
export interface PromoButtonProps {
  song: Song;
  meId: string;
}

/** Состояние и обработчик кнопки промо-плана */
export interface UsePromoButtonResult {
  /** В настройках проекта есть набор публикаций */
  hasSteps: boolean;
  isBusy: boolean;
  onAddClick: () => void;
}
