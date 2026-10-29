import type { ChangeEvent, FormEvent } from 'react';
import type { ThemeChoice } from '@/features/theme';
import type { Me, PendingImage } from '@/shared/types';

/** Вариант переключателя */
export interface ChoiceOption<Value extends string> {
  value: Value;
  label: string;
}

/** Пропсы формы смены пароля */
export interface PasswordSectionProps {
  oldPassword: string;
  password: string;
  /** Оба поля заполнены как надо: видна кнопка смены */
  canSubmit: boolean;
  isChanging: boolean;
  onOldPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFormSubmit: (event: FormEvent) => void;
}

/** Состояние и действия профиля */
export interface UseMePageResult {
  me: Me | null;
  theme: ThemeChoice;
  /** Выбранное фото: сначала обрезается под кружок, потом загружается */
  cropping: File | null;
  setCropping: (file: File | null) => void;
  avatarPending: PendingImage | undefined;
  oldPassword: string;
  password: string;
  canSubmitPassword: boolean;
  isChangingPassword: boolean;
  onAvatarRemove: () => void;
  onCropCancel: () => void;
  onCropDone: (file: File) => void;
  onNameSave: (name: string) => void;
  onOldPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordSubmit: (event: FormEvent) => void;
}
