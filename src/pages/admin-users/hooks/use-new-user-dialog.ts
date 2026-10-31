import type { FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  USERNAME_RE,
  PASSWORD_MIN_LENGTH,
  WHITESPACE_RE,
} from '../constants/admin-users';
import type { UseNewUserDialogResult } from '../types/admin-users';
import { UserRole } from '../types/admin-users';

/** Поля и создание новой учётной записи */
export function useNewUserDialog(
  onOpenChange: (isOpen: boolean) => void
): UseNewUserDialogResult {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(UserRole.User);

  const createUser = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.Users).create({
        username,
        name: name.trim(),
        password,
        passwordConfirm: password,
        is_admin: role === UserRole.Admin,
        can_create_projects: role !== UserRole.User,
      }),
    onSuccess: async () => {
      toast.success(
        `Учётная запись ${username} создана: 2FA подключается при первом входе`
      );
      onOpenChange(false);
      setUsername('');
      setName('');
      setPassword('');
      setRole(UserRole.User);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: () => toast.error('Не добавлен: возможно, такой логин уже есть'),
  });

  const isValid = [
    USERNAME_RE.test(username),
    name.trim() !== '',
    password.length >= PASSWORD_MIN_LENGTH,
  ].every(Boolean);
  const isSubmitDisabled = !isValid || createUser.isPending;

  const onFormSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (isValid) {
      createUser.mutate();
    }
  };

  const onUsernameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setUsername(event.target.value.toLowerCase().replace(WHITESPACE_RE, ''));
  };

  const onNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.target.value);
  };

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
  };

  const onCancelClick = (): void => {
    onOpenChange(false);
  };

  return {
    username,
    name,
    password,
    role,
    isSubmitDisabled,
    onFormSubmit,
    onUsernameChange,
    onNameChange,
    onPasswordChange,
    onRoleChange: setRole,
    onCancelClick,
  };
}
