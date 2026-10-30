import type { ProjectAvatarEditorProps } from './project-settings';

/** Настройка выпуска использует те же права владельца проекта */
export type MusicReleaseProps = ProjectAvatarEditorProps;

/** Подтверждение изменения выпуска */
export interface UseMusicReleaseResult {
  isEnabled: boolean;
  isConfirming: boolean;
  isSaving: boolean;
  isConfirmDisabled: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean | 'indeterminate') => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}
