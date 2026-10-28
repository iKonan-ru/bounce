import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type MenuOption<T extends string> = {
  value: T;
  label: string;
  // пояснение под названием
  hint?: string;
  icon?: ReactNode;
  // черта над пунктом: отделить "без песни", "нет доступа"
  separated?: boolean;
};

// Выбор одного варианта, как у статусов: тихая кнопка со стрелкой, меню с галочкой у текущего.
// Единый вид для всех выпадающих списков в строках свойств.
export function MenuSelect<T extends string>({
  value,
  options,
  onChange,
  label,
  dim,
  disabled,
  className,
}: {
  value: T;
  options: ReadonlyArray<MenuOption<T>>;
  onChange: (v: T) => void;
  // для экранного диктора: что выбирается
  label: string;
  // значение-пустышка ("Без песни", "Нет доступа") - приглушённым цветом
  dim?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled}
          aria-label={`${label}: ${current?.label ?? ''}`}
          className={cn(
            '-mr-2 h-9 max-w-56 gap-1.5 px-2 font-normal',
            dim && 'text-dim',
            className,
          )}
        >
          {current?.icon}
          <span className="truncate">{current?.label}</span>
          <ChevronDown className="size-4 shrink-0 text-dim" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 min-w-44 overflow-y-auto">
        {options.map((o) => (
          <MenuItem key={o.value} option={o} on={o.value === value} onSelect={onChange} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuItem<T extends string>({
  option,
  on,
  onSelect,
}: {
  option: MenuOption<T>;
  on: boolean;
  onSelect: (v: T) => void;
}) {
  return (
    <>
      {option.separated && <DropdownMenuSeparator />}
      <DropdownMenuItem onSelect={() => !on && onSelect(option.value)} className="gap-2.5">
        {option.icon}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{option.label}</span>
          {option.hint && <span className="text-xs text-dim">{option.hint}</span>}
        </span>
        {on && <Check className="size-4 shrink-0" />}
      </DropdownMenuItem>
    </>
  );
}
