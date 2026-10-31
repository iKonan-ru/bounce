import { createContext } from 'react';

/** Место для действий страницы в сохраняющейся шапке раздела. */
export const PageActionsContext = createContext<HTMLDivElement | null>(null);
