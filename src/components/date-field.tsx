import { CalendarDays, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { dateLabel, fromDay, toDay } from '@/lib/format';
import { cn } from '@/lib/utils';

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  danger?: boolean;
};

// Дата без времени (срок этапа, релиз): кнопка с датой, по нажатию - календарь.
export function DateField({
  id,
  value,
  onChange,
  placeholder = 'Выбрать дату',
  disabled,
  danger,
}: Props) {
  const [open, setOpen] = useState(false);
  const day = toDay(value);
  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-11 justify-start gap-2 px-3 font-normal',
              !value && 'text-dim',
              danger && 'text-led-red',
            )}
          >
            <CalendarDays className="size-4" />
            {value ? dateLabel(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            selected={day}
            {...(day ? { defaultMonth: day } : {})}
            onSelect={(d) => {
              onChange(d ? fromDay(d) : '');
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Убрать дату"
          onClick={() => onChange('')}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
