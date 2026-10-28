import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from '@tanstack/react-router';
import { MoreVertical, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/avatar';
import { BackLink } from '@/components/back-link';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetUserTotp, useMe } from '@/lib/auth';
import type { User } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { usersQuery } from '@/lib/queries';

const USERNAME = /^[a-z0-9][a-z0-9_.-]{2,31}$/;

// Учётные записи заводит и обслуживает главный пользователь.
export function AdminUsersPage() {
  const me = useMe();
  const users = useQuery(usersQuery);
  const [creating, setCreating] = useState(false);

  if (me && !me.isAdmin) return <Navigate to="/me" />;

  return (
    <section>
      <BackLink to="/me">Профиль</BackLink>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Пользователи</h1>
      <ul className="flex flex-col">
        {users.data?.map((u) => (
          <UserRow key={u.id} user={u} self={u.id === me?.id} />
        ))}
      </ul>
      <Button className="mt-4 w-full" size="lg" onClick={() => setCreating(true)}>
        <Plus data-icon="inline-start" />
        Новый пользователь
      </Button>
      <NewUserDrawer open={creating} onOpenChange={setCreating} />
    </section>
  );
}

type Dialogs = 'none' | 'password' | 'totp' | 'delete';

function UserRow({ user, self }: { user: User; self: boolean }) {
  const client = useQueryClient();
  const [dialog, setDialog] = useState<Dialogs>('none');
  const [password, setPassword] = useState('');
  const close = () => {
    setDialog('none');
    setPassword('');
  };
  const refresh = () => client.invalidateQueries({ queryKey: ['users'] });

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
      toast.error('Пользователь не удалён: возможно, он владелец проекта или автор записей'),
  });
  const busy = setNewPassword.isPending || resetTotp.isPending || remove.isPending;

  return (
    <li className="flex items-center gap-3 border-b py-3 last:border-b-0">
      <Avatar name={user.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate">
          {user.name} <span className="text-dim">@{user.username}</span>
        </p>
        <p className="text-xs text-dim">
          {user.is_admin ? 'Главный, ' : ''}
          {user.totp_enabled ? '2FA подключена' : '2FA не подключена'}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Действия: ${user.name}`} disabled={busy}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog('password')}>Задать пароль</DropdownMenuItem>
          {user.totp_enabled && (
            <DropdownMenuItem onSelect={() => setDialog('totp')}>Сбросить 2FA</DropdownMenuItem>
          )}
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
        open={dialog === 'delete'}
        onOpenChange={(o) => !o && close()}
        title={`Удалить ${user.name}?`}
        description="Учётная запись удалится, вход станет невозможен."
        confirm="Удалить"
        busy={busy}
        onConfirm={() => remove.mutate()}
      />
    </li>
  );
}

function NewUserDrawer({
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

  const create = useMutation({
    mutationFn: () =>
      collection(pb, 'users').create({
        username,
        name: name.trim(),
        password,
        passwordConfirm: password,
        is_admin: admin,
      }),
    onSuccess: async () => {
      toast.success(`Учётная запись ${username} создана: 2FA подключается при первом входе`);
      onOpenChange(false);
      setUsername('');
      setName('');
      setPassword('');
      setAdmin(false);
      await client.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Не добавлен: возможно, такой логин уже есть'),
  });

  const valid = USERNAME.test(username) && name.trim() !== '' && password.length >= 8;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (valid) create.mutate();
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <form onSubmit={submit} className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pb-6">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-lg">Новый пользователь</DrawerTitle>
            <DrawerDescription>
              Логин и пароль передайте лично: 2FA он подключит при первом входе.
            </DrawerDescription>
          </DrawerHeader>
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
            <span>Главный: заводит пользователей</span>
          </label>
          <Button type="submit" size="lg" disabled={!valid || create.isPending}>
            Добавить
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
