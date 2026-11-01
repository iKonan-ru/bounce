import type { ProjectAvatarEditorProps } from './project-settings';

/** Настройка выпуска использует те же права владельца проекта */
export type MusicReleaseProps = ProjectAvatarEditorProps;

/** Состояние переключателя выпуска */
export interface UseMusicReleaseResult {
  isEnabled: boolean;
  isDisabled: boolean;
  onChange: (checked: boolean | 'indeterminate') => void;
}
