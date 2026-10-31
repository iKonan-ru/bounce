import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ListFiltersProps } from '../types/list-filters';
import { Collapse } from './collapse';
import { Button } from './kit/button';
import { Input } from './kit/input';

/** Единые поиск, панель параметров и снятие активных фильтров */
export function ListFilters({
  searchId,
  searchLabel,
  searchValue,
  onSearchChange,
  chips,
  onReset,
  children,
}: ListFiltersProps): ReactNode {
  const hasChips = chips.length > 0;
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `${searchId}-filters`;
  const onToggle = (): void => setIsOpen(!isOpen);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dim" />
          <label htmlFor={searchId} className="sr-only">
            {searchLabel}
          </label>
          <Input
            id={searchId}
            type="search"
            placeholder="Поиск"
            value={searchValue}
            onChange={onSearchChange}
            className="h-10 pl-9 md:h-9"
          />
        </div>
        <Button
          variant={isOpen ? 'secondary' : 'outline'}
          className="h-10 shrink-0 gap-2 md:h-9"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <SlidersHorizontal className="size-4" />
          <span className="max-sm:sr-only">Фильтры</span>
          {hasChips && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {chips.length}
            </span>
          )}
        </Button>
      </div>
      <Collapse isOpen={isOpen}>
        <div
          id={panelId}
          role="region"
          aria-label="Параметры фильтрации"
          className="flex flex-col rounded-xl border border-border/70 bg-panel/50 py-2"
        >
          {children}
          {hasChips && (
            <Button
              variant="ghost"
              className="mx-2 mt-2 self-end text-dim"
              onClick={onReset}
            >
              Сбросить фильтры
            </Button>
          )}
        </div>
      </Collapse>
      {hasChips && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onClear}
              className="flex min-h-8 max-w-full items-center gap-1 rounded-lg bg-groove px-2.5 text-sm transition-colors hover:bg-groove/70"
            >
              <span className="truncate">{chip.label}</span>
              <X className="size-3.5 shrink-0 text-dim" aria-label="убрать" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
