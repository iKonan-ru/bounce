import type { StageStatus } from '@/lib/model';

// Цвет светодиода по статусу этапа: зелёный - готово, янтарный - в работе; не начатый не
// горит, пропущенный - пустая рамка. Свечение - только в тёмной теме (--led-glow).
export const LED_CLASS: Record<StageStatus, string> = {
  not_started: 'bg-led-off',
  in_progress: 'bg-led-amber shadow-[0_0_var(--led-glow)_var(--led-amber)]',
  done: 'bg-led-green shadow-[0_0_var(--led-glow)_var(--led-green)]',
  skipped: 'border border-dashed border-dim/60 bg-transparent',
};

export const TEXT_CLASS: Record<StageStatus, string> = {
  not_started: 'text-dim',
  in_progress: 'text-led-amber',
  done: 'text-led-green',
  skipped: 'text-dim',
};
