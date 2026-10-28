import type { StageStatus } from '@/lib/model';

// Цвет светодиода по статусу этапа: зелёный - готово, янтарный - в работе, голубой - ждёт
// проверки; не начатый не горит, пропущенный - пустая рамка.
export const LED_CLASS: Record<StageStatus, string> = {
  not_started: 'bg-groove',
  in_progress: 'bg-led-amber shadow-[0_0_8px_var(--led-amber)]',
  review: 'bg-led-cyan shadow-[0_0_8px_var(--led-cyan)]',
  done: 'bg-led-green shadow-[0_0_6px_var(--led-green)]',
  skipped: 'border border-dashed border-dim/60 bg-transparent',
};

export const TEXT_CLASS: Record<StageStatus, string> = {
  not_started: 'text-dim',
  in_progress: 'text-led-amber',
  review: 'text-led-cyan',
  done: 'text-led-green',
  skipped: 'text-dim',
};
