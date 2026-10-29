// Страницы вместо английской заглушки роутера и белого экрана (app/routes/router.tsx): неизвестный адрес и
// ошибка при показе страницы. Обе ведут туда, где можно продолжить работу.
import { Home } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from './kit/button';
import { Screen } from './screen';

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
