import { useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, Outlet } from '@tanstack/react-router';
import { Disc3, Lightbulb, SlidersVertical } from 'lucide-react';
import { useEffect } from 'react';
import { useMe } from '@/lib/auth';
import { subscribeRealtime } from '@/lib/queries';

const TABS = [
  { to: '/songs', label: 'Песни', icon: Disc3 },
  { to: '/ideas', label: 'Идеи', icon: Lightbulb },
  { to: '/findings', label: 'Находки', icon: SlidersVertical },
] as const;

export function AppShell() {
  const me = useMe();
  const client = useQueryClient();

  useEffect(() => (me ? subscribeRealtime(client) : undefined), [me, client]);

  if (!me) return <Navigate to="/login" />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <main className="flex-1 px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-console/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-xl grid-cols-3">
          {TABS.map((t) => (
            <li key={t.to}>
              <Link
                to={t.to}
                className="flex flex-col items-center gap-1 py-2.5 text-xs text-dim transition-colors data-[status=active]:text-ink"
              >
                <t.icon className="size-5" strokeWidth={1.75} />
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
