import type { ReactNode } from 'react';
import type { LogoProps } from '../types/logo';
import { cn } from '../utils/cn';

/** Знак Bounce: три сегмента индикатора и "отскок" над ними */
export function Logo({ className }: LogoProps): ReactNode {
  const logoClassName = cn('size-10', className);

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={logoClassName}>
      <rect width="64" height="64" rx="16" fill="var(--panel)" />
      <rect
        x="15"
        y="38"
        width="8"
        height="12"
        rx="2"
        fill="var(--led-green)"
      />
      <rect
        x="28"
        y="30"
        width="8"
        height="20"
        rx="2"
        fill="var(--led-green)"
      />
      <rect
        x="41"
        y="34"
        width="8"
        height="16"
        rx="2"
        fill="var(--led-amber)"
      />
      <circle cx="32" cy="17" r="5" fill="var(--tape)" />
    </svg>
  );
}
