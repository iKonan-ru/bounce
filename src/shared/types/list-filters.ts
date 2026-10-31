import type { ChangeEvent, ReactNode } from 'react';

/** Активное условие, которое можно снять отдельно */
export interface FilterChip {
  label: string;
  onClear: () => void;
}

/** Общая строка поиска и фильтров списка */
export interface ListFiltersProps {
  searchId: string;
  searchLabel: string;
  searchValue: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  chips: FilterChip[];
  onReset: () => void;
  children: ReactNode;
}
