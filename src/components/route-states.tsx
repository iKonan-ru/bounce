import { type ErrorComponentProps, Link } from '@tanstack/react-router';
import { Home, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

// Страницы вместо английской заглушки роутера и белого экрана (router.tsx): неизвестный адрес и
// ошибка при показе страницы. Обе ведут туда, где можно продолжить работу.

function Screen({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-dim">{text}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>
    </main>
  );
}

export function NotFoundScreen() {
  return (
    <Screen title="Страница не найдена" text="Адрес неверный, или страницу уже удалили.">
      <Button asChild>
        <Link to="/">
          <Home data-icon="inline-start" />
          На главную
        </Link>
      </Button>
    </Screen>
  );
}

export function ErrorScreen({ error }: ErrorComponentProps) {
  // подробности - для разработчика в консоли, человеку - что делать
  console.error(error);
  return (
    <Screen
      title="Что-то пошло не так"
      text="Страница не открылась. Обновите её; если не поможет - вернитесь на главную."
    >
      <Button onClick={() => window.location.reload()}>
        <RotateCw data-icon="inline-start" />
        Обновить
      </Button>
      <Button variant="secondary" asChild>
        <Link to="/">На главную</Link>
      </Button>
    </Screen>
  );
}
