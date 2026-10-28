import { cn } from '@/lib/utils';

// кружок с первой буквой имени: участников двое-трое, фото не нужны
export function Avatar({ name, className }: { name: string; className?: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-groove text-sm font-medium',
        className,
      )}
    >
      {letter}
    </span>
  );
}
