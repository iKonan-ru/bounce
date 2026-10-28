import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight, DatabaseBackup, Users } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logout, useMe } from '@/lib/auth';
import { collection, pb } from '@/lib/pb';
import { setTheme, type ThemeChoice, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

export function MePage() {
  const me = useMe();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');

  const savedName = me?.name ?? '';
  useEffect(() => setName(savedName), [savedName]);

  const saveName = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error('нет входа');
      await collection(pb, 'users').update(me.id, { name: name.trim() });
      await pb.collection('users').authRefresh();
    },
    onSuccess: () => toast.success('Имя сохранено'),
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });

  // после смены пароля PocketBase закрывает сессии - входим заново на экране входа
  const changePassword = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error('нет входа');
      await collection(pb, 'users').update(me.id, {
        oldPassword,
        password,
        passwordConfirm: password,
      });
    },
    onSuccess: () => {
      toast.success('Пароль изменён, войдите с новым паролем');
      logout();
    },
    onError: () => toast.error('Пароль не изменён: проверьте старый пароль'),
  });

  if (!me) return null;

  function submitName(e: FormEvent) {
    e.preventDefault();
    if (name.trim() && name.trim() !== me?.name) saveName.mutate();
  }

  function submitPassword(e: FormEvent) {
    e.preventDefault();
    if (oldPassword && password.length >= 8) changePassword.mutate();
  }

  return (
    <section className="flex max-w-xl flex-col gap-8">
      <PageHeader
        crumbs={[{ label: 'Проекты', link: { to: '/projects' } }]}
        title={me.name}
        meta={<p className="text-sm text-dim">@{me.username}</p>}
      />
      <form onSubmit={submitName} className="flex flex-col gap-2">
        <Label htmlFor="name">Отображаемое имя</Label>
        <div className="flex gap-2">
          <Input
            id="name"
            required
            maxLength={60}
            value={name}
            disabled={saveName.isPending}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            className="h-11"
            disabled={saveName.isPending || !name.trim() || name.trim() === me.name}
          >
            Сохранить
          </Button>
        </div>
      </form>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Тема</legend>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={theme === t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                'h-11 rounded-lg border px-2 text-sm transition-colors',
                theme === t.value ? 'border-ink/40 bg-panel text-ink' : 'text-dim active:bg-panel',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      {me.isAdmin && (
        <div className="flex flex-col gap-2">
          <Link
            to="/admin/users"
            className="flex min-h-12 items-center gap-3 rounded-xl bg-panel px-4 hover:bg-groove/50 active:bg-groove"
          >
            <Users className="size-5 text-dim" />
            <span className="flex-1">Пользователи</span>
            <ChevronRight className="size-4 text-dim" />
          </Link>
          <Link
            to="/admin/backup"
            className="flex min-h-12 items-center gap-3 rounded-xl bg-panel px-4 hover:bg-groove/50 active:bg-groove"
          >
            <DatabaseBackup className="size-5 text-dim" />
            <span className="flex-1">Резервная копия</span>
            <ChevronRight className="size-4 text-dim" />
          </Link>
        </div>
      )}

      <form onSubmit={submitPassword} className="flex flex-col gap-3">
        <span className="text-sm font-medium">Пароль</span>
        <div className="flex flex-col gap-2">
          <Label htmlFor="old-password">Текущий</Label>
          <Input
            id="old-password"
            type="password"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">Новый, не короче 8 символов</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          disabled={changePassword.isPending || !oldPassword || password.length < 8}
        >
          Сменить пароль
        </Button>
      </form>

      <Button variant="ghost" className="self-start" onClick={logout}>
        Выйти
      </Button>
    </section>
  );
}
