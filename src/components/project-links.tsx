import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { GROUP_ROWS } from '@/components/page';
import { ServiceIcon } from '@/components/service-icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Project, ProjectLink } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import {
  MUSIC_SERVICES,
  normalizeUrl,
  type Service,
  serviceById,
  serviceForUrl,
  shortUrl,
} from '@/lib/services';
import { cn } from '@/lib/utils';

// ссылки проекта в порядке списка сервисов
export function projectLinks(project: Pick<Project, 'links'>): ProjectLink[] {
  const links = project.links ?? [];
  return MUSIC_SERVICES.flatMap((s) => links.filter((l) => l.service === s.id && l.url));
}

const ROW = 'flex min-h-14 items-center gap-3 px-4 py-2';

// Ссылки в настройках: только добавленные, каждая видна целиком (адрес переносится); правится
// в окне, где сервис узнаётся по вставленной ссылке сам.
export function ProjectLinksEditor({ project, editable }: { project: Project; editable: boolean }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<ProjectLink | 'new' | null>(null);
  const links = projectLinks(project);

  const save = useMutation({
    mutationFn: (next: ProjectLink[]) =>
      collection(pb, 'projects').update(project.id, { links: next }),
    onSettled: () => client.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => toast.error('Ссылка не сохранилась: проверьте соединение'),
  });

  // ссылка сервиса заменяется; при смене сервиса старая запись уходит
  function put(link: ProjectLink, before: ProjectLink | null) {
    const rest = links.filter((l) => l.service !== link.service && l.service !== before?.service);
    save.mutate([...rest, link]);
  }
  const drop = (link: ProjectLink) => save.mutate(links.filter((l) => l.service !== link.service));

  return (
    <>
      <div className={GROUP_ROWS}>
        {links.map((l) => {
          const s = serviceById(MUSIC_SERVICES, l.service);
          if (!s) return null;
          return (
            <div key={l.service} className={ROW}>
              <ServiceIcon service={s} />
              {editable ? (
                <button
                  type="button"
                  onClick={() => setEditing(l)}
                  className="-my-1 min-w-0 flex-1 rounded-md py-1 text-left"
                  aria-label={`Изменить ссылку: ${s.name}`}
                >
                  <LinkText service={s} url={l.url} />
                </button>
              ) : (
                <span className="min-w-0 flex-1">
                  <LinkText service={s} url={l.url} />
                </span>
              )}
              <Button variant="ghost" size="icon-sm" className="-mr-2 text-dim" asChild>
                <a href={l.url} target="_blank" rel="noreferrer" aria-label={`Открыть: ${s.name}`}>
                  <ExternalLink />
                </a>
              </Button>
            </div>
          );
        })}
        {links.length === 0 && !editable && (
          <p className="px-4 py-3 text-sm text-dim">Ссылок пока нет</p>
        )}
        {editable && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-dim transition-colors hover:bg-groove/40 hover:text-ink md:min-h-11"
          >
            <Plus className="size-5 shrink-0" />
            Добавить ссылку
          </button>
        )}
      </div>
      <LinkDialog
        open={editing !== null}
        link={editing === 'new' ? null : editing}
        taken={links.map((l) => l.service)}
        onClose={() => setEditing(null)}
        onSave={put}
        onDelete={drop}
      />
    </>
  );
}

function LinkText({ service, url }: { service: Service; url: string }) {
  return (
    <span className="block min-w-0">
      <span className="block font-medium">{service.name}</span>
      <span className="block text-sm break-all text-dim">{shortUrl(url)}</span>
    </span>
  );
}

function LinkDialog({
  open,
  link,
  taken,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  link: ProjectLink | null;
  // сервисы, у которых ссылка уже есть
  taken: ReadonlyArray<string>;
  onClose: () => void;
  onSave: (link: ProjectLink, before: ProjectLink | null) => void;
  onDelete: (link: ProjectLink) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <LinkForm
            key={link?.service ?? 'new'}
            link={link}
            taken={taken}
            onClose={onClose}
            onSave={onSave}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LinkForm({
  link,
  taken,
  onClose,
  onSave,
  onDelete,
}: {
  link: ProjectLink | null;
  taken: ReadonlyArray<string>;
  onClose: () => void;
  onSave: (link: ProjectLink, before: ProjectLink | null) => void;
  onDelete: (link: ProjectLink) => void;
}) {
  const [url, setUrl] = useState(link?.url ?? '');
  const [service, setService] = useState(link?.service ?? '');
  // сервис, выбранный руками, ссылка уже не меняет
  const [chosen, setChosen] = useState(Boolean(link));
  const [deleting, setDeleting] = useState(false);
  const normalized = normalizeUrl(url);
  const free = (id: string) => id === link?.service || !taken.includes(id);
  const ready = normalized !== null && service !== '' && free(service);

  function change(v: string) {
    setUrl(v);
    if (chosen) return;
    const n = normalizeUrl(v);
    const found = n ? serviceForUrl(MUSIC_SERVICES, n) : undefined;
    if (found && free(found.id)) setService(found.id);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || !normalized) return;
    onSave({ service, url: normalized }, link);
    onClose();
  }

  const current = serviceById(MUSIC_SERVICES, link?.service ?? '');

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{current ? current.name : 'Новая ссылка'}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-url">Ссылка</Label>
        {/* поле растёт по ссылке: она видна целиком, а не обрезана */}
        <Textarea
          id="link-url"
          inputMode="url"
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          rows={1}
          placeholder="https://music.yandex.ru/artist/..."
          value={url}
          onChange={(e) => change(e.target.value.replace(/\s+/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          aria-invalid={url.trim() !== '' && normalized === null}
          className="min-h-10 resize-none break-all"
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Сервис</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {MUSIC_SERVICES.map((s) => {
            const on = s.id === service;
            const busy = !free(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                disabled={busy}
                title={busy ? 'Ссылка уже есть' : undefined}
                onClick={() => {
                  setService(s.id);
                  setChosen(true);
                }}
                className={cn(
                  'flex h-10 min-w-0 items-center gap-2 rounded-lg px-2.5 text-left text-sm ring-1 transition-colors md:h-9',
                  on
                    ? 'bg-tape text-tape-ink ring-transparent'
                    : 'ring-border/70 hover:bg-groove/50 dark:ring-border/40',
                  busy && 'opacity-40',
                )}
              >
                <ServiceIcon service={s} className="size-4" />
                <span className="truncate">{s.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <DialogFooter className="sm:justify-between">
        {link ? (
          <Button
            type="button"
            variant="ghost"
            className="text-led-red hover:text-led-red"
            onClick={() => setDeleting(true)}
          >
            Удалить
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={!ready}>
            Сохранить
          </Button>
        </div>
      </DialogFooter>
      {link && (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title={`Удалить ссылку на ${current?.name ?? 'сервис'}?`}
          confirm="Удалить"
          onConfirm={() => {
            onDelete(link);
            setDeleting(false);
            onClose();
          }}
        />
      )}
    </form>
  );
}

// Ссылки внизу страницы проекта: плашки со знаком и названием; при наведении знак становится
// фирменного цвета.
export function ProjectLinksBar({ project, className }: { project: Project; className?: string }) {
  const links = projectLinks(project);
  if (links.length === 0) return null;
  return (
    <ul aria-label="Ссылки" className={cn('flex flex-wrap gap-2', className)}>
      {links.map((l) => {
        const s = serviceById(MUSIC_SERVICES, l.service);
        if (!s) return null;
        return (
          <li key={l.service}>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="group/brand flex h-10 items-center gap-2 rounded-full bg-panel pr-4 pl-3 text-sm text-dim ring-1 ring-border/70 transition-colors hover:text-ink md:h-9 dark:bg-white/5 dark:ring-border/40"
            >
              <ServiceIcon service={s} brandOnHover className="size-[1.125rem]" />
              {s.name}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
