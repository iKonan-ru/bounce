import type { ReactNode } from 'react';
import { GROUP_ROWS } from '@/shared/constants';
import { Section, Input, Button } from '@/shared/ui';
import { MIN_PASSWORD_LENGTH } from '../constants/me';
import type { PasswordSectionProps } from '../types/me';

/** Смена пароля: текущий и новый */
export function PasswordSection({
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
