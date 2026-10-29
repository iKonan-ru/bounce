import { StageStatus } from '@/lib/model';

/**
 * Цвет светодиода по статусу этапа: зелёный - готово, янтарный - в работе; не начатый не
 * горит, пропущенный - пустая рамка
 *
 * Свечение - только в тёмной теме (--led-glow)
 */
export const LED_CLASS: Record<StageStatus, string> = {
  [StageStatus.not_started]: 'bg-led-off',
  [StageStatus.in_progress]:
    'bg-led-amber shadow-[0_0_var(--led-glow)_var(--led-amber)]',
  [StageStatus.done]:
    'bg-led-green shadow-[0_0_var(--led-glow)_var(--led-green)]',
  [StageStatus.skipped]: 'border border-dashed border-dim/60 bg-transparent',
};

/** Цвет текста по статусу этапа */
export const TEXT_CLASS: Record<StageStatus, string> = {
  [StageStatus.not_started]: 'text-dim',
  [StageStatus.in_progress]: 'text-led-amber',
  [StageStatus.done]: 'text-led-green',
  [StageStatus.skipped]: 'text-dim',
};
