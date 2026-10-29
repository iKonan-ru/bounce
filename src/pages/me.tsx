import { Users, ChevronRight, DatabaseBackup, LogOut } from 'lucide-react';
import type { RecordModel } from 'pocketbase';
import type { ReactNode, ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { dropSession, logout } from '@/features/auth';
import { ThemeChoice, useTheme, setTheme } from '@/features/theme';
import { Collections, pb, queryKeys, getCollection } from '@/shared/api';
import { GROUP_ROWS, SAVE_FAILED } from '@/shared/constants';
import { useMe, useFieldUpload } from '@/shared/hooks';
import type { Crumb, FileRecord, Me, PendingImage } from '@/shared/types';
import {
  Section,
  Input,
  Button,
  ImageSlot,
  PageHeader,
  AvatarCropDialog,
  PropRow,
  AutosaveInput,
  Segmented,
} from '@/shared/ui';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

/** Вариант переключателя */
interface ChoiceOption<Value extends string> {
  value: Value;
  label: string;
}

/** Варианты темы */
const THEME_OPTIONS: readonly ChoiceOption<ThemeChoice>[] = [
  { value: ThemeChoice.System, label: 'Как в системе' },
  { value: ThemeChoice.Light, label: 'Светлая' },
  { value: ThemeChoice.Dark, label: 'Тёмная' },
];

/** Строка-ссылка в группе "Управление" */
const LINK_ROW_CLASS_NAME =
  'flex min-h-12 items-center gap-3 px-4 transition-colors hover:bg-groove/40 md:min-h-11';

/** Профиль - корень пути: хлебных крошек нет */
const NO_CRUMBS: readonly Crumb[] = [];

/** Поле аватара в записи пользователя */
const AVATAR_FIELD = 'avatar';

/** Уменьшенные копии аватара, которые нужны сразу после загрузки */
const AVATAR_THUMBS: readonly string[] = ['96x96', '256x256'];

/** Запись-заглушка для загрузки аватара, пока нет входа */
const EMPTY_USER_RECORD: FileRecord = {
  id: '',
  collectionId: '',
  collectionName: Collections.Users,
};

/** Самый короткий новый пароль */
const MIN_PASSWORD_LENGTH = 8;

/** Плашка аватара без фото: первая буква имени */
function getInitial(name: string): string {
  const letter = name.trim().charAt(0).toUpperCase();

  if (!letter) {
    return '?';
  }

  return letter;
}

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

/** Ссылки на страницы главного пользователя */
function AdminLinks(): ReactNode {
  return (
    <Section title="Управление">
      <div className={GROUP_ROWS}>
        <Link to="/admin/users" className={LINK_ROW_CLASS_NAME}>
          <Users className="size-4 text-dim" />
          <span className="flex-1">Пользователи</span>
          <ChevronRight className="size-4 text-dim/60" />
        </Link>
        <Link to="/admin/backup" className={LINK_ROW_CLASS_NAME}>
          <DatabaseBackup className="size-4 text-dim" />
          <span className="flex-1">Резервная копия</span>
          <ChevronRight className="size-4 text-dim/60" />
        </Link>
      </div>
    </Section>
  );
}

/** Пропсы формы смены пароля */
interface PasswordSectionProps {
  oldPassword: string;
  password: string;
  /** Оба поля заполнены как надо: видна кнопка смены */
  canSubmit: boolean;
  isChanging: boolean;
  onOldPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFormSubmit: (event: FormEvent) => void;
}

/** Смена пароля: текущий и новый */
function PasswordSection({
  oldPassword,
  password,
  canSubmit,
  isChanging,
  onOldPasswordChange,
  onPasswordChange,
  onFormSubmit,
}: PasswordSectionProps): ReactNode {
  return (
    <Section title="Пароль">
      <form onSubmit={onFormSubmit} className={GROUP_ROWS}>
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
            onChange={onOldPasswordChange}
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
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={onPasswordChange}
            className="h-12 rounded-none border-0 bg-transparent px-4 shadow-none focus-visible:ring-0 dark:bg-transparent md:h-11"
          />
        </div>
        {canSubmit && (
          <div className="flex justify-end px-3 py-2">
            <Button
              type="submit"
              size="sm"
              className="h-9 px-3"
              disabled={isChanging}
            >
              Сменить пароль
            </Button>
          </div>
        )}
      </form>
    </Section>
  );
}

/** Состояние и действия профиля */
interface UseMePageResult {
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

/** Аватар, имя и пароль текущего пользователя */
function useMePage(): UseMePageResult {
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

/** Профиль: фото, имя, тема, пароль и выход */
export function MePage(): ReactNode {
  const {
    me,
    theme,
    cropping,
    setCropping,
    avatarPending,
    oldPassword,
    password,
    canSubmitPassword,
    isChangingPassword,
    onAvatarRemove,
    onCropCancel,
    onCropDone,
    onNameSave,
    onOldPasswordChange,
    onPasswordChange,
    onPasswordSubmit,
  } = useMePage();

  if (!me) {
    return null;
  }

  const avatarFile = me.avatar || undefined;
  const initial = getInitial(me.name);
  const usernameLabel = `@${me.username}`;
  const avatarPlaceholder = (
    <span className="text-2xl font-semibold text-ink">{initial}</span>
  );
  const avatarSlot = (
    <ImageSlot
      record={me}
      file={avatarFile}
      thumb="256x256"
      title={me.name}
      onPick={setCropping}
      pending={avatarPending}
      canZoom={false}
      canReplace
      onRemove={onAvatarRemove}
      placeholder={avatarPlaceholder}
      className="size-16 rounded-full"
    />
  );

  return (
    <section className="max-w-xl">
      <PageHeader
        crumbs={NO_CRUMBS}
        media={avatarSlot}
        title={me.name}
        meta={usernameLabel}
      />
      <AvatarCropDialog
        file={cropping}
        onCancel={onCropCancel}
        onDone={onCropDone}
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
                onSave={onNameSave}
              />
            </PropRow>
            <PropRow label="Логин">
              <span className="px-2 text-dim">{me.username}</span>
            </PropRow>
          </div>
        </Section>

        <Section title="Тема">
          <Segmented
            label="Тема"
            options={THEME_OPTIONS}
            value={theme}
            onChange={setTheme}
          />
        </Section>

        {me.isAdmin && <AdminLinks />}

        <PasswordSection
          oldPassword={oldPassword}
          password={password}
          canSubmit={canSubmitPassword}
          isChanging={isChangingPassword}
          onOldPasswordChange={onOldPasswordChange}
          onPasswordChange={onPasswordChange}
          onFormSubmit={onPasswordSubmit}
        />

        <div>
          <Button variant="ghost" className="-ml-3.5 text-dim" onClick={logout}>
            <LogOut data-icon="inline-start" />
            Выйти
          </Button>
        </div>
      </div>
    </section>
  );
}
