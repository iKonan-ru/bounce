import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { User } from '@/entities/user';
import { resetUserTotp } from '@/features/auth';
import { queryKeys, getCollection, pb, Collections } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { PASSWORD_MIN_LENGTH } from '../constants/admin-users';
import type { UseUserRowResult } from '../types/admin-users';
import { UserDialog } from '../types/admin-users';

/** Действия с учётной записью: пароль, 2FA, отключение, удаление, право создавать проекты */
export function useUserRow(user: User): UseUserRowResult {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<UserDialog>(UserDialog.None);
  const [password, setPassword] = useState('');
  const isPasswordValid = password.length >= PASSWORD_MIN_LENGTH;

  const handleDialogClose = (): void => {
    setDialog(UserDialog.None);
    setPassword('');
  };

  const refreshUsers = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

  const setNewPassword = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.Users).update(user.id, {
        password,
        passwordConfirm: password,
      }),
    onSuccess: () => {
      toast.success(`Пароль ${user.name} изменён`);
      handleDialogClose();
    },
    onError: () => toast.error('Пароль не изменён'),
  });
  const resetTotp = useMutation({
    mutationFn: () => resetUserTotp(user.id),
    onSuccess: async () => {
      toast.success(`2FA ${user.name} сброшена`);
      handleDialogClose();
      await refreshUsers();
    },
    onError: () => toast.error('2FA не сброшена'),
  });
  const removeUser = useMutation({
    mutationFn: () => getCollection(pb, Collections.Users).delete(user.id),
    onSuccess: async () => {
      handleDialogClose();
      await refreshUsers();
    },
    onError: () =>
      toast.error(
        'Пользователь не удалён: возможно, он владелец проекта или автор записей. Его можно отключить'
      ),
  });
  // отключённый не входит, его сессии закрыты; записи и роли остаются (pb_hooks/users.pb.js)
  const switchOff = useMutation({
    mutationFn: (disabled: boolean) =>
      getCollection(pb, Collections.Users).update(user.id, { disabled }),
    onSuccess: async (_updated, disabled) => {
      if (disabled) {
        toast.success(`${user.name} отключён`);
      } else {
        toast.success(`${user.name} снова может войти`);
      }

      handleDialogClose();
      await refreshUsers();
    },
    onError: () => toast.error(SAVE_FAILED),
  });
  const setCanCreateProjects = useMutation({
    mutationFn: (canCreate: boolean) =>
      getCollection(pb, Collections.Users).update(user.id, {
        can_create_projects: canCreate,
      }),
    onSuccess: refreshUsers,
    onError: () => toast.error(SAVE_FAILED),
  });
  const isBusy = [
    setNewPassword.isPending,
    resetTotp.isPending,
    removeUser.isPending,
    setCanCreateProjects.isPending,
    switchOff.isPending,
  ].some(Boolean);

  const onCreatorToggleSelect = (): void => {
    setCanCreateProjects.mutate(!user.can_create_projects);
  };

  const onPasswordSelect = (): void => {
    setDialog(UserDialog.Password);
  };

  const onTotpSelect = (): void => {
    setDialog(UserDialog.Totp);
  };

  const onEnableSelect = (): void => {
    switchOff.mutate(false);
  };

  const onDisableSelect = (): void => {
    setDialog(UserDialog.Disable);
  };

  const onDeleteSelect = (): void => {
    setDialog(UserDialog.Delete);
  };

  const onDialogOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      handleDialogClose();
    }
  };

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
  };

  const onPasswordSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (isPasswordValid) {
      setNewPassword.mutate();
    }
  };

  const onCancelClick = (): void => {
    handleDialogClose();
  };

  const onTotpResetConfirm = (): void => {
    resetTotp.mutate();
  };

  const onDisableConfirm = (): void => {
    switchOff.mutate(true);
  };

  const onDeleteConfirm = (): void => {
    removeUser.mutate();
  };

  return {
    dialog,
    password,
    isBusy,
    isPasswordValid,
    onCreatorToggleSelect,
    onPasswordSelect,
    onTotpSelect,
    onEnableSelect,
    onDisableSelect,
    onDeleteSelect,
    onDialogOpenChange,
    onPasswordChange,
    onPasswordSubmit,
    onCancelClick,
    onTotpResetConfirm,
    onDisableConfirm,
    onDeleteConfirm,
  };
}
