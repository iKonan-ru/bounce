import { Home, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { type ErrorComponentProps, Link } from '@tanstack/react-router';

// Страницы вместо английской заглушки роутера и белого экрана (router.tsx): неизвестный адрес и
// ошибка при показе страницы. Обе ведут туда, где можно продолжить работу.

/** Пропсы экрана-заглушки */
interface ScreenProps {
  title: string;
  /** Пояснение под заголовком */
  text: string;
  /** Кнопки: куда идти дальше */
  children: ReactNode;
}

/** Экран-заглушка по центру: заголовок, пояснение и кнопки */
function Screen({ title, text, children }: ScreenProps): ReactNode {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-dim">{text}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>
    </main>
  );
}

/** Неизвестный адрес */
export function NotFoundScreen(): ReactNode {
  return (
    <Screen
      title="Страница не найдена"
      text="Адрес неверный, или страницу уже удалили."
    >
      <Button asChild>
        <Link to="/">
          <Home data-icon="inline-start" />
          На главную
        </Link>
      </Button>
    </Screen>
  );
}

/** Ошибка при показе страницы */
export function ErrorScreen({ error }: ErrorComponentProps): ReactNode {
  // подробности - для разработчика в консоли, человеку - что делать
  console.error(error);
  const onReloadClick = (): void => {
    window.location.reload();
  };

  return (
    <Screen
      title="Что-то пошло не так"
      text="Страница не открылась. Обновите её; если не поможет - вернитесь на главную."
    >
      <Button onClick={onReloadClick}>
        <RotateCw data-icon="inline-start" />
        Обновить
      </Button>
      <Button variant="secondary" asChild>
        <Link to="/">На главную</Link>
      </Button>
    </Screen>
  );
}
