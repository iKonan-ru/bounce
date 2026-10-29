import { CloudOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnline } from '@/lib/offline';
import { cn } from '@/lib/utils';

// Заглушка, пока данные грузятся. Без сети они не придут: вместо вечной заглушки - объяснение.
export function Loading({ className }: { className?: string }) {
  const online = useOnline();
  if (online) return <Skeleton className={className} />;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl bg-panel px-4 py-3 text-sm text-dim ring-1 ring-border/60',
        className,
        'h-auto',
      )}
    >
      <CloudOff className="size-4 shrink-0" />
      Нет сети, а на устройстве этого ещё нет. Откроется, когда связь вернётся.
    </div>
  );
}
