import type { ReactNode } from 'react';
import type { ScreenProps } from '../types/route-states';

/** Экран-заглушка по центру: заголовок, пояснение и кнопки */
export function Screen({ title, text, children }: ScreenProps): ReactNode {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-dim">{text}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>
    </main>
  );
}
