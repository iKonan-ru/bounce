import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from '@tanstack/react-router';
import { MoreVertical, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/avatar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Loading } from '@/components/loading';
import { PageHeader } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetUserTotp, useMe } from '@/lib/auth';
import { SAVE_FAILED } from '@/lib/errors';
import type { User } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { usersQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const USERNAME = /^[a-z0-9][a-z0-9_.-]{2,31}$/;

// Учётные записи заводит и обслуживает главный пользователь.
export function AdminUsersPage() {
  const me = useMe();
  const users = useQuery(usersQuery);
  const [creating, setCreating] = useState(false);

  if (me && !me.isAdmin) return <Navigate to="/me" />;

  return (
    <section className="max-w-2xl">
      <PageHeader
        crumbs={[{ label: 'Профиль', link: { to: '/me' } }]}
        title="Пользователи"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            Новый пользователь
          </Button>
        }
      />
      {users.isPending && <Loading className="h-40 rounded-xl" />}
      {users.isError && !users.data && (
        <p className="text-led-red">Список пользователей не загрузился.</p>
      )}
      <ul className="flex flex-col">
        {users.data?.map((u) => (
          <UserRow key={u.id} user={u} self={u.id === me?.id} />
        ))}
      </ul>
      <NewUserDialog open={creating} onOpenChange={setCreating} />
    </section>
  );
}

type Dialogs = 'none' | 'password' | 'totp' | 'disable' | 'delete';

function UserRow({ user, self }: { user: User; self: boolean }) {
  const client = useQueryClient();
  const [dialog, setDialog] = useState<Dialogs>('none');
  const [password, setPassword] = useState('');
  const close = () => {
    setDialog('none');
    setPassword('');
  };
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.users.all });

  const setNewPassword = useMutation({
    mutationFn: () =>
      collection(pb, 'users').update(user.id, { password, passwordConfirm: password }),
    onSuccess: () => {
      toast.success(`Пароль ${user.name} изменён`);
      close();
    },
    onError: () => toast.error('Пароль не изменён'),
  });
  const resetTotp = useMutation({
    mutationFn: () => resetUserTotp(user.id),
    onSuccess: async () => {
      toast.success(`2FA ${user.name} сброшена`);
      close();
      await refresh();
    },
    onError: () => toast.error('2FA не сброшена'),
  });
  const remove = useMutation({
    mutationFn: () => collection(pb, 'users').delete(user.id),
    onSuccess: async () => {
      close();
      await refresh();
    },
    onError: () =>
      toast.error(
        'Пользователь не удалён: возможно, он владелец проекта или автор записей. Его можно отключить',
      ),
  });
  // отключённый не входит, его сессии закрыты; записи и роли остаются (pb_hooks/users.pb.js)
  const switchOff = useMutation({
    mutationFn: (disabled: boolean) => collection(pb, 'users').update(user.id, { disabled }),
    onSuccess: async (_, disabled) => {
      toast.success(disabled ? `${user.name} отключён` : `${user.name} снова может войти`);
      close();
      await refresh();
    },
    onError: () => toast.error(SAVE_FAILED),
  });
  const creator = useMutation({
    mutationFn: (can: boolean) =>
      collection(pb, 'users').update(user.id, { can_create_projects: can }),
    onSuccess: refresh,
    onError: () => toast.error(SAVE_FAILED),
  });
  const busy =
    setNewPassword.isPending ||
    resetTotp.isPending ||
    remove.isPending ||
    creator.isPending ||
    switchOff.isPending;

  return (
    <li className="flex items-center gap-3 border-b py-3 last:border-b-0">
      <Avatar user={user} className={cn('size-10', user.disabled && 'opacity-50')} />
      <div className={cn('min-w-0 flex-1', user.disabled && 'text-dim')}>
        <p className="truncate">
          {user.name} <span className="text-dim">@{user.username}</span>
        </p>
        <p className="text-xs text-dim">
          {[
            user.disabled ? 'Отключён' : '',
            user.is_admin ? 'Главный' : '',
            !user.is_admin && user.can_create_projects ? 'Создаёт проекты' : '',
            user.totp_enabled ? '2FA подключена' : '2FA не подключена',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Действия: ${user.name}`} disabled={busy}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!user.is_admin && (
            <DropdownMenuItem onSelect={() => creator.mutate(!user.can_create_projects)}>
              {user.can_create_projects
                ? 'Запретить создавать проекты'
                : 'Разрешить создавать проекты'}
            </DropdownMenuItem>
          )}
          {/* свой пароль меняют в профиле - со старым паролем */}
          {!self && (
            <DropdownMenuItem onSelect={() => setDialog('password')}>
              Задать пароль
            </DropdownMenuItem>
          )}
          {user.totp_enabled && (
            <DropdownMenuItem onSelect={() => setDialog('totp')}>Сбросить 2FA</DropdownMenuItem>
          )}
          {!self &&
            (user.disabled ? (
              <DropdownMenuItem onSelect={() => switchOff.mutate(false)}>Включить</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => setDialog('disable')}>Отключить</DropdownMenuItem>
            ))}
          {!self && (
            <DropdownMenuItem variant="destructive" onSelect={() => setDialog('delete')}>
              Удалить
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === 'password'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password.length >= 8) setNewPassword.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Новый пароль для {user.name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`pw-${user.id}`}>Не короче 8 символов</Label>
              <Input
                id={`pw-${user.id}`}
                type="text"
                autoComplete="off"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" disabled={busy} onClick={close}>
                Отмена
              </Button>
              <Button type="submit" disabled={busy || password.length < 8}>
                Задать пароль
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialog === 'totp'}
        onOpenChange={(o) => !o && close()}
        title={`Сбросить 2FA для ${user.name}?`}
        description="Сессии пользователя закроются. При следующем входе он подключит 2FA заново."
        confirm="Сбросить 2FA"
        busy={busy}
        onConfirm={() => resetTotp.mutate()}
      />
      <ConfirmDialog
        open={dialog === 'disable'}
        onOpenChange={(o) => !o && close()}
        title={`Отключить ${user.name}?`}
        description="Вход станет невозможен, открытые сессии закроются. Заметки, задачи, публикации, роли в проектах и назначения останутся. Если он владелец проекта, переименовать проект, менять участников и удалить его будет некому, пока учётную запись не включат. Включить можно в любой момент."
        confirm="Отключить"
        busy={busy}
        onConfirm={() => switchOff.mutate(true)}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(o) => !o && close()}
        title={`Удалить ${user.name}?`}
        description="Учётная запись удалится, вход станет невозможен; из ролей в проектах и исполнителей человек уберётся. Владельца проекта и автора заметок, задач или публикаций удалить нельзя - такого можно отключить."
        confirm="Удалить"
        busy={busy}
        onConfirm={() => remove.mutate()}
      />
    </li>
  );
}

function NewUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const client = useQueryClient();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [admin, setAdmin] = useState(false);
  const [creates, setCreates] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      collection(pb, 'users').create({
        username,
        name: name.trim(),
        password,
        passwordConfirm: password,
        is_admin: admin,
        can_create_projects: admin || creates,
      }),
    onSuccess: async () => {
      toast.success(`Учётная запись ${username} создана: 2FA подключается при первом входе`);
      onOpenChange(false);
      setUsername('');
      setName('');
      setPassword('');
      setAdmin(false);
      setCreates(false);
      await client.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: () => toast.error('Не добавлен: возможно, такой логин уже есть'),
  });

  const valid = USERNAME.test(username) && name.trim() !== '' && password.length >= 8;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (valid) create.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Новый пользователь</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-username">Логин: латиница, цифры, точка, дефис</Label>
            <Input
              id="new-username"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              required
              maxLength={32}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-name">Отображаемое имя</Label>
            <Input
              id="new-name"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">Пароль, не короче 8 символов</Label>
            <Input
              id="new-password"
              type="text"
              autoComplete="off"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <label htmlFor="new-admin" className="flex min-h-11 items-center gap-3">
            <Checkbox
              id="new-admin"
              className="size-5"
              checked={admin}
              onCheckedChange={(v) => setAdmin(v === true)}
            />
            <span>Главный пользователь</span>
          </label>
          {!admin && (
            <label htmlFor="new-creates" className="flex min-h-11 items-center gap-3">
              <Checkbox
                id="new-creates"
                className="size-5"
                checked={creates}
                onCheckedChange={(v) => setCreates(v === true)}
              />
              <span>Может создавать проекты</span>
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={!valid || create.isPending}>
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
