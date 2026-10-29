import { ChevronDown, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  MenuSelectProps,
  MenuSelectItemProps,
} from '../types/menu-select';
import { cn } from '../utils/cn';
import { Button } from './kit/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from './kit/dropdown-menu';

/**
 * Выбор одного варианта, как у статусов: тихая кнопка со стрелкой, меню с галочкой у текущего
 *
 * Единый вид для всех выпадающих списков в строках свойств
 */
export function MenuSelect<Value extends string>({
  value,
  options,
  onChange,
  label,
  isDim,
  disabled,
  className,
}: MenuSelectProps<Value>): ReactNode {
  const currentOption = options.find((option) => option.value === value);
  const currentLabel = currentOption?.label ?? '';
  const triggerLabel = `${label}: ${currentLabel}`;
  const triggerClassName = cn(
    '-mr-2 h-9 max-w-56 gap-1.5 px-2 font-normal',
    { 'text-dim': isDim },
    className
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled}
          aria-label={triggerLabel}
          className={triggerClassName}
        >
          {currentOption?.icon}
          <span className="truncate">{currentOption?.label}</span>
          <ChevronDown className="size-4 shrink-0 text-dim" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-80 min-w-44 overflow-y-auto"
      >
        {options.map((option) => (
          <MenuSelectItem
            key={option.value}
            option={option}
            currentValue={value}
            onSelect={onChange}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Пункт меню выбора: значок, название с пояснением и галочка у текущего */
function MenuSelectItem<Value extends string>({
  option,
  currentValue,
  onSelect,
}: MenuSelectItemProps<Value>): ReactNode {
  const isCurrent = option.value === currentValue;
  const onItemSelect = (): void => {
    if (!isCurrent) {
      onSelect(option.value);
    }
  };

  return (
    <>
      {option.isSeparated && <DropdownMenuSeparator />}
      <DropdownMenuItem onSelect={onItemSelect} className="gap-2.5">
        {option.icon}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{option.label}</span>
          {option.hint && (
            <span className="text-xs text-dim">{option.hint}</span>
          )}
        </span>
        {isCurrent && <Check className="size-4 shrink-0" />}
      </DropdownMenuItem>
    </>
  );
}
