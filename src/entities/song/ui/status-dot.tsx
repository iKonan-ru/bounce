import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { LED_CLASS } from '../constants/status';
import type { StatusDotProps } from '../types/stage-status';

/** Светодиод статуса этапа */
export function StatusDot({ status, className }: StatusDotProps): ReactNode {
  const dotClassName = cn(
    'size-2.5 shrink-0 rounded-full',
    LED_CLASS[status],
    className
  );

  return <span className={dotClassName} />;
}
