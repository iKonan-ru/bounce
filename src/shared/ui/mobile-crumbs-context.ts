import { createContext } from 'react';

/** Место для пути страницы рядом с логотипом в мобильной шапке */
export const MobileCrumbsContext = createContext<HTMLDivElement | null>(null);
