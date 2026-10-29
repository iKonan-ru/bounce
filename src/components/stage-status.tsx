import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { LED_CLASS } from '@/components/status';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StageStatus } from '@/lib/model';
import { STAGE_STATUS_LABEL, STAGE_STATUSES } from '@/lib/statuses';
import { cn } from '@/lib/utils';

/** Пропсы светодиода статуса */
interface StatusDotProps {
  status: StageStatus;
  className?: string;
}

/** Светодиод статуса этапа */
export function StatusDot({ status, className }: StatusDotProps): ReactNode {
  const dotClassName = cn('size-2.5 shrink-0 rounded-full', LED_CLASS[status], className);
  return <span className={dotClassName} />;
}

/** Пропсы выбора статуса этапа */
interface StageStatusPickerProps {
  value: StageStatus;
  onChange: (status: StageStatus) => void;
  /** Только показать статус, без выбора */
  readOnly?: boolean;
}

/** Выбор статуса этапа: кнопка со светодиодом, по нажатию - список */
export function StageStatusPicker({
  value,
  onChange,
  readOnly,
}: StageStatusPickerProps): ReactNode {
  if (readOnly) {
    return (
      <span className="flex items-center gap-2 px-2">
        <StatusDot status={value} />
        {STAGE_STATUS_LABEL[value]}
      </span>
    );
  }
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
        {STAGE_STATUSES.map((status) => (
          <StageStatusItem key={status} status={status} currentStatus={value} onSelect={onChange} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Пропсы пункта списка статусов */
interface StageStatusItemProps {
  status: StageStatus;
  /** Статус, который сейчас у этапа */
  currentStatus: StageStatus;
  onSelect: (status: StageStatus) => void;
}

/** Пункт списка статусов: светодиод, подпись и галочка у текущего */
function StageStatusItem({ status, currentStatus, onSelect }: StageStatusItemProps): ReactNode {
  const isCurrent = status === currentStatus;
  const onItemSelect = (): void => {
    if (!isCurrent) {
      onSelect(status);
    }
  };
  return (
    <DropdownMenuItem onSelect={onItemSelect} className="gap-2.5">
      <StatusDot status={status} />
      <span className="flex-1">{STAGE_STATUS_LABEL[status]}</span>
      {isCurrent && <Check className="size-4" />}
    </DropdownMenuItem>
  );
}
