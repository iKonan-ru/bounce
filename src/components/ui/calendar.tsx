import { ChevronLeft, ChevronRight } from 'lucide-react';
import type * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ru } from 'react-day-picker/locale';
import { cn } from '@/lib/utils';

function Chevron({ orientation }: { orientation?: 'up' | 'down' | 'left' | 'right' }) {
  return orientation === 'left' ? (
    <ChevronLeft className="size-4" />
  ) : (
    <ChevronRight className="size-4" />
  );
}

// Календарь на react-day-picker: русские названия, неделя с понедельника.
function Calendar({ className, classNames, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={ru}
      weekStartsOn={1}
      showOutsideDays
      className={cn('select-none', className)}
      classNames={{
        months: 'relative flex flex-col',
        month: 'flex flex-col gap-3',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous:
          'flex size-9 items-center justify-center rounded-lg text-dim hover:bg-groove hover:text-ink disabled:opacity-40',
        button_next:
          'flex size-9 items-center justify-center rounded-lg text-dim hover:bg-groove hover:text-ink disabled:opacity-40',
        month_caption: 'flex h-9 items-center justify-center text-sm font-medium capitalize',
        weekdays: 'flex',
        weekday: 'w-10 text-center text-xs font-normal text-dim',
        week: 'mt-1 flex',
        day: 'size-10 p-0 text-center text-sm',
        day_button:
          'size-10 rounded-lg transition-colors hover:bg-groove focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary',
        today: '[&>button]:font-semibold [&>button]:underline [&>button]:underline-offset-4',
        outside: 'text-dim/50',
        disabled: 'opacity-40',
        ...classNames,
      }}
      components={{ Chevron }}
      {...props}
    />
  );
}

export { Calendar };
