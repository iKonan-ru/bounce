import type { StageStatus } from './song';

/** Пропсы светодиода статуса */
export interface StatusDotProps {
  status: StageStatus;
  className?: string;
}

/** Пропсы выбора статуса этапа */
export interface StageStatusPickerProps {
  value: StageStatus;
  onChange: (status: StageStatus) => void;
  /** Только показать статус, без выбора */
  readOnly?: boolean;
}

/** Пропсы пункта списка статусов */
export interface StageStatusItemProps {
  status: StageStatus;
  /** Статус, который сейчас у этапа */
  currentStatus: StageStatus;
  onSelect: (status: StageStatus) => void;
}
