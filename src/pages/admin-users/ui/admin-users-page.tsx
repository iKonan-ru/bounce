import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { usersQuery } from '@/entities/user';
import { useMe } from '@/shared/hooks';
import { Button, PageHeader, Loading } from '@/shared/ui';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from '@tanstack/react-router';
import { ADMIN_CRUMBS } from '../constants/admin-users';
import { NewUserDialog } from './new-user-dialog';
import { UserRow } from './user-row';

/** Учётные записи заводит и обслуживает главный пользователь */
export function AdminUsersPage(): ReactNode {
  const me = useMe();
  const users = useQuery(usersQuery);
  const [isCreating, setIsCreating] = useState(false);
  const isNotAdmin = me !== null && !me.isAdmin;
  const hasLoadError = users.isError && !users.data;

  const onNewUserClick = (): void => {
    setIsCreating(true);
  };

  if (isNotAdmin) {
    return <Navigate to="/me" />;
  }

  const newUserButton = (
    <Button onClick={onNewUserClick}>
      <Plus data-icon="inline-start" />
      Новый пользователь
    </Button>
  );

  return (
    <section className="max-w-2xl">
      <PageHeader
        crumbs={ADMIN_CRUMBS}
        title="Пользователи"
        actions={newUserButton}
      />
      {users.isPending && <Loading className="h-40 rounded-xl" />}
      {hasLoadError && (
        <p className="text-led-red">Список пользователей не загрузился.</p>
      )}
      <ul className="flex flex-col">
        {users.data?.map((user) => {
          const isSelf = user.id === me?.id;

          return <UserRow key={user.id} user={user} isSelf={isSelf} />;
        })}
      </ul>
      <NewUserDialog open={isCreating} onOpenChange={setIsCreating} />
    </section>
  );
}
