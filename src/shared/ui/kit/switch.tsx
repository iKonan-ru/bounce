import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../utils/cn';

/** Переключатель настройки с доступным состоянием и фокусом клавиатуры */
export function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border bg-groove transition-colors outline-none after:absolute after:-inset-y-2 after:-inset-x-1 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-panel shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-primary-foreground" />
    </SwitchPrimitive.Root>
  );
}
