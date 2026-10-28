import { Check, ChevronDown } from 'lucide-react';
import { LED_CLASS } from '@/components/status';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { STAGE_STATUS_LABEL, STAGE_STATUSES, type StageStatus } from '@/lib/model';
import { cn } from '@/lib/utils';

export function StatusDot({ status, className }: { status: StageStatus; className?: string }) {
  return <span className={cn('size-2.5 shrink-0 rounded-full', LED_CLASS[status], className)} />;
}

// Выбор статуса этапа: кнопка со светодиодом, по нажатию - список.
export function StageStatusPicker({
  value,
  onChange,
}: {
  value: StageStatus;
  onChange: (s: StageStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="-mr-2 h-9 gap-2 px-2 font-normal">
          <StatusDot status={value} />
          {STAGE_STATUS_LABEL[value]}
          <ChevronDown className="size-4 text-dim" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {STAGE_STATUSES.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => s !== value && onChange(s)} className="gap-2.5">
            <StatusDot status={s} />
            <span className="flex-1">{STAGE_STATUS_LABEL[s]}</span>
            {s === value && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
