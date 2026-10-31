import { CloudOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { MiniPlayer } from '@/features/player';
import { subscribeRealtime } from '@/shared/api';
import { useMe } from '@/shared/hooks';
import { MobileCrumbsContext } from '@/shared/ui';
import { rememberReturn } from '@/shared/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet } from '@tanstack/react-router';
import { MAIN_CLASS_NAME } from '../constants/app-shell';
import { useAppLayout } from '../hooks/use-app-layout';
import type { SignInProps } from '../types/app-shell';
import { MobileProfile } from './mobile-profile';
import { Sidebar } from './sidebar';
import { TabBar } from './tab-bar';

/** Всё, кроме входа и подключения 2FA: нет входа - на вход, нет 2FA - на её подключение */
export function AuthGate(): ReactNode {
  const me = useMe();
  const client = useQueryClient();
  const isReady = me?.isTotpEnabled === true;

  useEffect(() => {
    if (!isReady) {
      return undefined;
    }

    return subscribeRealtime(client);
  }, [isReady, client]);

  if (!me) {
    return <SignIn to="/login" />;
  }

  if (!me.isTotpEnabled) {
    return <SignIn to="/setup-2fa" />;
  }

  return <AppLayout key={me.id} />;
}

/**
 * На вход или подключение 2FA - запомнив, куда шли (shared/utils/return-to.ts)
 *
 * Адрес - из window.location, а не useLocation: подписка на смену адреса перерисовывала бы
 * Navigate во время перехода, и он переходил бы снова и снова
 */
function SignIn({ to }: SignInProps): ReactNode {
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    rememberReturn(pathname + search + hash);
  }, []);

  return <Navigate to={to} />;
}

/**
 * Каркас приложения
 *
 * Телефон: содержимое во всю ширину, внутри проекта - вкладки внизу. Планшет и компьютер: слева
 * панель с проектами и разделами текущего проекта, её можно свернуть до значков
 */
function AppLayout(): ReactNode {
  const [mobileCrumbsTarget, setMobileCrumbsTarget] =
    useState<HTMLDivElement | null>(null);
  const {
    projectId,
    pathname,
    pageKey,
    section,
    isOnline,
    tabProjectId,
    tabSection,
  } = useAppLayout();

  return (
    <div className="min-h-dvh md:flex">
      {!isOnline && (
        <div
          role="status"
          className="fixed top-[max(env(safe-area-inset-top),0.5rem)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-tape px-3 py-1.5 text-xs font-medium text-tape-ink shadow-lg"
        >
          <CloudOff className="size-3.5" />
          Нет сети
        </div>
      )}
      <Sidebar projectId={projectId} section={section} pathname={pathname} />
      <MobileCrumbsContext value={mobileCrumbsTarget}>
        <main className={MAIN_CLASS_NAME}>
          <MobileProfile crumbsRef={setMobileCrumbsTarget} />
          {/* Музыка и видео сохраняют общий контейнер при переключении. */}
          <div key={pageKey} className="flex flex-1 flex-col animate-enter">
            <Outlet />
          </div>
          {/* плеер вне страницы: запись играет дальше при переходах */}
          <MiniPlayer />
        </main>
      </MobileCrumbsContext>
      <TabBar
        projectId={tabProjectId}
        section={tabSection}
        pathname={pathname}
      />
    </div>
  );
}
