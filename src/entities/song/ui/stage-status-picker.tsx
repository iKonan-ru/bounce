import { ChevronDown, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  Button,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/ui';
import { STAGE_STATUS_LABEL, STAGE_STATUSES } from '../constants/statuses';
import type {
  StageStatusPickerProps,
  StageStatusItemProps,
} from '../types/stage-status';
import { StatusDot } from './status-dot';

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
          <StageStatusItem
            key={status}
            status={status}
            currentStatus={value}
            onSelect={onChange}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Пункт списка статусов: светодиод, подпись и галочка у текущего */
function StageStatusItem({
  status,
  currentStatus,
  onSelect,
}: StageStatusItemProps): ReactNode {
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
