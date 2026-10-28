import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus, Star } from 'lucide-react';
import { CATEGORY_LABEL, INSTRUMENT_LABEL } from '@/lib/findings';
import { pb } from '@/lib/pb';
import { findingsQuery } from '@/lib/queries';

type Props = { projectId: string; songId: string; stageId: string };

// Находки, привязанные к этапу, - прямо в его шторке.
export function StageFindings({ projectId, songId, stageId }: Props) {
  const filter = pb.filter('project = {:p} && stage = {:s}', { p: projectId, s: stageId });
  const findings = useQuery(findingsQuery(projectId, filter));
  const list = findings.data ?? [];

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Находки этапа</h3>
      {list.length > 0 && (
        <ul className="flex flex-col gap-2">
          {list.map((f) => (
            <li key={f.id}>
              <Link
                to="/p/$projectId/findings"
                params={{ projectId }}
                search={{ open: f.id }}
                className="flex items-center gap-2 rounded-lg bg-console px-3 py-2 active:bg-groove"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{f.title}</span>
                  <span className="block truncate text-xs text-dim">
                    {[
                      f.instrument && INSTRUMENT_LABEL[f.instrument],
                      f.category && CATEGORY_LABEL[f.category],
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </span>
                {f.library && (
                  <Star className="size-4 shrink-0 text-led-amber" aria-label="В библиотеке" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/p/$projectId/findings"
        params={{ projectId }}
        search={{ song: songId, stage: stageId }}
        className="flex min-h-10 items-center gap-2 text-sm text-dim active:text-ink"
      >
        <Plus className="size-4" />
        Записать находку
      </Link>
    </section>
  );
}
