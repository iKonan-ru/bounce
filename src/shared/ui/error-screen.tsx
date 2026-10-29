import { RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { Button } from './kit/button';
import { Screen } from './screen';

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
