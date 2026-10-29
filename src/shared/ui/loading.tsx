import { CloudOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { useIsOnline } from '../hooks/use-is-online';
import type { LoadingProps } from '../types/loading';
import { cn } from '../utils/cn';
import { Skeleton } from './kit/skeleton';

/** Заглушка, пока данные грузятся; без сети они не придут: вместо вечной заглушки - объяснение */
export function Loading({ className }: LoadingProps): ReactNode {
  const isOnline = useIsOnline();

  if (isOnline) {
    return <Skeleton className={className} />;
  }

  const offlineClassName = cn(
    'flex items-center gap-3 rounded-xl bg-panel px-4 py-3 text-sm text-dim ring-1 ring-border/60',
    className,
    'h-auto'
  );

  return (
    <div className={offlineClassName}>
      <CloudOff className="size-4 shrink-0" />
      Нет сети, а на устройстве этого ещё нет. Откроется, когда связь вернётся.
    </div>
  );
}
