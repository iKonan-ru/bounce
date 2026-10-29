import type { ReactNode } from 'react';

/** Пропсы экрана-заглушки */
export interface ScreenProps {
  title: string;
  /** Пояснение под заголовком */
  text: string;
  /** Кнопки: куда идти дальше */
  children: ReactNode;
}
