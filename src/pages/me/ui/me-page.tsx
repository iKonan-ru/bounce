import { Users, ChevronRight, DatabaseBackup, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { logout } from '@/features/auth';
import { setTheme } from '@/features/theme';
import { GROUP_ROWS } from '@/shared/constants';
import {
  Section,
  ImageSlot,
  PageHeader,
  AvatarCropDialog,
  PropRow,
  AutosaveInput,
  Segmented,
  Button,
} from '@/shared/ui';
import { Link } from '@tanstack/react-router';
import { LINK_ROW_CLASS_NAME, NO_CRUMBS, THEME_OPTIONS } from '../constants/me';
import { useMePage } from '../hooks/use-me-page';
import { PasswordSection } from './password-section';

/** Плашка аватара без фото: первая буква имени */
function getInitial(name: string): string {
  const letter = name.trim().charAt(0).toUpperCase();

  if (!letter) {
    return '?';
  }

  return letter;
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
