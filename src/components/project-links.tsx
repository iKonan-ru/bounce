import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AutosaveInput } from '@/components/autosave-input';
import { GROUP_ROWS } from '@/components/page';
import { ServiceIcon } from '@/components/service-icon';
import type { Project, ProjectLink } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { MUSIC_SERVICES, serviceById } from '@/lib/services';
import { cn } from '@/lib/utils';

const isUrl = (v: string) => v === '' || /^https?:\/\/\S+$/i.test(v);

// ссылки проекта в порядке списка сервисов
export function projectLinks(project: Pick<Project, 'links'>): ProjectLink[] {
  const links = project.links ?? [];
  return MUSIC_SERVICES.flatMap((s) => links.filter((l) => l.service === s.id && l.url));
}

// Таблица ссылок в настройках: по строке на сервис; пустое поле - ссылки нет.
export function ProjectLinksEditor({ project, editable }: { project: Project; editable: boolean }) {
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (links: ProjectLink[]) => collection(pb, 'projects').update(project.id, { links }),
    onSettled: () => client.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => toast.error('Ссылка не сохранилась: проверьте соединение'),
  });
  const current = project.links ?? [];
  const urlOf = (id: string) => current.find((l) => l.service === id)?.url ?? '';
  const setUrl = (id: string, url: string) =>
    save.mutate([
      ...current.filter((l) => l.service !== id),
      ...(url ? [{ service: id, url }] : []),
    ]);

  return (
    <div className={GROUP_ROWS}>
      {MUSIC_SERVICES.map((s) => (
        <div key={s.id} className="flex min-h-12 items-center gap-3 px-4 md:min-h-11">
          <ServiceIcon service={s} className={cn(!urlOf(s.id) && 'opacity-50')} />
          <label htmlFor={`link-${s.id}`} className="w-32 shrink-0 truncate text-dim">
            {s.name}
          </label>
          <AutosaveInput
            id={`link-${s.id}`}
            placeholder="https://..."
            disabled={!editable}
            value={urlOf(s.id)}
            validate={isUrl}
            onSave={(url) => setUrl(s.id, url)}
            className="text-left"
          />
        </div>
      ))}
    </div>
  );
}

// Ссылки-значки на странице проекта.
export function ProjectLinksBar({ project }: { project: Project }) {
  const links = projectLinks(project);
  if (links.length === 0) return null;
  return (
    <ul className="-ml-1.5 flex flex-wrap gap-0.5">
      {links.map((l) => {
        const s = serviceById(MUSIC_SERVICES, l.service);
        if (!s) return null;
        return (
          <li key={l.service}>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              title={s.name}
              aria-label={s.name}
              className="flex size-9 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove/60 hover:text-ink"
            >
              <ServiceIcon service={s} className="size-[1.125rem]" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
