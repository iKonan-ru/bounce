import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight, DatabaseBackup, LogOut, Users } from 'lucide-react';
import type { RecordModel } from 'pocketbase';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { AutosaveInput } from '@/components/autosave-input';
import { AvatarCropDialog } from '@/components/avatar-crop';
import { ImageSlot, useFieldUpload } from '@/components/images';
import { GROUP_ROWS, PageHeader, Section } from '@/components/page';
import { PropRow } from '@/components/prop-row';
import { Segmented } from '@/components/segmented';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dropSession, logout, useMe } from '@/lib/auth';
import { collection, pb } from '@/lib/pb';
import { setTheme, type ThemeChoice, useTheme } from '@/lib/theme';

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

const LINK_ROW =
  'flex min-h-12 items-center gap-3 px-4 transition-colors hover:bg-groove/40 md:min-h-11';

export function MePage() {
  const me = useMe();
  const theme = useTheme();
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  // выбранное фото сначала обрезается под кружок, потом загружается
  const [cropping, setCropping] = useState<File | null>(null);

  const avatar = useFieldUpload<RecordModel>({
    record: me ?? { id: '', collectionId: '', collectionName: 'users' },
    field: 'avatar',
    thumbs: ['96x96', '256x256'],
    refresh: ['users'],
    onSaved: (next) => pb.authStore.save(pb.authStore.token, next),
  });
  const removeAvatar = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error('нет входа');
      const next = await collection(pb, 'users').update<RecordModel>(me.id, { avatar: '' });
      pb.authStore.save(pb.authStore.token, next);
    },
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });

  const saveName = useMutation({
    mutationFn: async (name: string) => {
      if (!me) throw new Error('нет входа');
      await collection(pb, 'users').update(me.id, { name });
      await pb.collection('users').authRefresh();
    },
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
      dropSession();
    },
    onError: () => toast.error('Пароль не изменён: проверьте текущий пароль'),
  });

  if (!me) return null;

  function submitPassword(e: FormEvent) {
    e.preventDefault();
    if (oldPassword && password.length >= 8) changePassword.mutate();
  }

  return (
    <section className="max-w-xl">
      <PageHeader
        crumbs={[]}
        media={
          <ImageSlot
            record={me}
            file={me.avatar || undefined}
            thumb="256x256"
            title={me.name}
            onPick={setCropping}
            pending={avatar.pending}
            zoom={false}
            replace
            onRemove={() => removeAvatar.mutate()}
            placeholder={
              <span className="text-2xl font-semibold text-ink">
                {me.name.trim().charAt(0).toUpperCase() || '?'}
              </span>
            }
            className="size-16 rounded-full"
          />
        }
        title={me.name}
        meta={`@${me.username}`}
      />
      <AvatarCropDialog
        file={cropping}
        onCancel={() => setCropping(null)}
        onDone={(file) => {
          setCropping(null);
          avatar.pick(file);
        }}
      />
      <div className="flex flex-col gap-8">
        <Section title="Профиль">
          <div className={GROUP_ROWS}>
            <PropRow label="Имя">
              <AutosaveInput
                id="name"
                required
                maxLength={60}
                value={me.name}
                onSave={(n) => saveName.mutate(n)}
              />
            </PropRow>
            <PropRow label="Логин">
              <span className="px-2 text-dim">{me.username}</span>
            </PropRow>
          </div>
        </Section>

        <Section title="Тема">
          <Segmented label="Тема" options={THEMES} value={theme} onChange={setTheme} />
        </Section>

        {me.isAdmin && (
          <Section title="Управление">
            <div className={GROUP_ROWS}>
              <Link to="/admin/users" className={LINK_ROW}>
                <Users className="size-4 text-dim" />
                <span className="flex-1">Пользователи</span>
                <ChevronRight className="size-4 text-dim/60" />
              </Link>
              <Link to="/admin/backup" className={LINK_ROW}>
                <DatabaseBackup className="size-4 text-dim" />
                <span className="flex-1">Резервная копия</span>
                <ChevronRight className="size-4 text-dim/60" />
              </Link>
            </div>
          </Section>
        )}

        <Section title="Пароль">
          <form onSubmit={submitPassword} className={GROUP_ROWS}>
            <div>
              <label htmlFor="old-password" className="sr-only">
                Текущий пароль
              </label>
              <Input
                id="old-password"
                type="password"
                autoComplete="current-password"
                placeholder="Текущий пароль"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="h-12 rounded-none border-0 bg-transparent px-4 shadow-none focus-visible:ring-0 dark:bg-transparent md:h-11"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="sr-only">
                Новый пароль
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Новый пароль, от 8 символов"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-none border-0 bg-transparent px-4 shadow-none focus-visible:ring-0 dark:bg-transparent md:h-11"
              />
            </div>
            {oldPassword && password.length >= 8 && (
              <div className="flex justify-end px-3 py-2">
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 px-3"
                  disabled={changePassword.isPending}
                >
                  Сменить пароль
                </Button>
              </div>
            )}
          </form>
        </Section>

        <div>
          <Button variant="ghost" className="-ml-2 text-dim" onClick={logout}>
            <LogOut data-icon="inline-start" />
            Выйти
          </Button>
        </div>
      </div>
    </section>
  );
}
