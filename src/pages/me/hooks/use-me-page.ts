import type { RecordModel } from 'pocketbase';
import type { FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { dropSession } from '@/features/auth';
import { useTheme } from '@/features/theme';
import { pb, queryKeys, getCollection, Collections } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useMe, useFieldUpload } from '@/shared/hooks';
import type { Me } from '@/shared/types';
import { useMutation } from '@tanstack/react-query';
import {
  EMPTY_USER_RECORD,
  AVATAR_FIELD,
  AVATAR_THUMBS,
  MIN_PASSWORD_LENGTH,
} from '../constants/me';
import type { UseMePageResult } from '../types/me';

/** Текущий пользователь, без которого правки профиля невозможны */
function requireMe(me: Me | null): Me {
  if (!me) {
    throw new Error('нет входа');
  }

  return me;
}

/** Обновить пользователя в сессии записью, которую вернул сервер */
function saveAuthRecord(next: RecordModel): void {
  pb.authStore.save(pb.authStore.token, next);
}

/** Аватар, имя и пароль текущего пользователя */
export function useMePage(): UseMePageResult {
  const me = useMe();
  const theme = useTheme();
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [cropping, setCropping] = useState<File | null>(null);

  const avatar = useFieldUpload<RecordModel>({
    record: me ?? EMPTY_USER_RECORD,
    field: AVATAR_FIELD,
    thumbs: AVATAR_THUMBS,
    refresh: queryKeys.users.all,
    onSaved: saveAuthRecord,
  });

  const removeAvatar = useMutation({
    mutationFn: async (): Promise<void> => {
      const user = requireMe(me);
      const next = await getCollection(
        pb,
        Collections.Users
      ).update<RecordModel>(user.id, {
        avatar: '',
      });
      saveAuthRecord(next);
    },
    onError: () => {
      toast.error(SAVE_FAILED);
    },
  });

  const saveName = useMutation({
    mutationFn: async (name: string): Promise<void> => {
      const user = requireMe(me);
      await getCollection(pb, Collections.Users).update(user.id, { name });
      await pb.collection(Collections.Users).authRefresh();
    },
    onError: () => {
      toast.error(SAVE_FAILED);
    },
  });

  // после смены пароля PocketBase закрывает сессии - входим заново на экране входа
  const changePassword = useMutation({
    mutationFn: async (): Promise<void> => {
      const user = requireMe(me);
      await getCollection(pb, Collections.Users).update(user.id, {
        oldPassword,
        password,
        passwordConfirm: password,
      });
    },
    onSuccess: () => {
      toast.success('Пароль изменён, войдите с новым паролем');
      dropSession();
    },
    onError: () => {
      toast.error('Пароль не изменён: проверьте текущий пароль');
    },
  });

  const isPasswordLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmitPassword = Boolean(oldPassword) && isPasswordLongEnough;

  const onPasswordSubmit = (event: FormEvent): void => {
    event.preventDefault();

    if (canSubmitPassword) {
      changePassword.mutate();
    }
  };

  const onAvatarRemove = (): void => {
    removeAvatar.mutate();
  };

  const onCropCancel = (): void => {
    setCropping(null);
  };

  const onCropDone = (file: File): void => {
    setCropping(null);
    avatar.pick(file);
  };

  const onNameSave = (name: string): void => {
    saveName.mutate(name);
  };

  const onOldPasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setOldPassword(event.target.value);
  };

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
  };

  return {
    me,
    theme,
    cropping,
    setCropping,
    avatarPending: avatar.pending,
    oldPassword,
    password,
    canSubmitPassword,
    isChangingPassword: changePassword.isPending,
    onAvatarRemove,
    onCropCancel,
    onCropDone,
    onNameSave,
    onOldPasswordChange,
    onPasswordChange,
    onPasswordSubmit,
  };
}
