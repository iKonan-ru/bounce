import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ExternalLink, Plus } from 'lucide-react';
import { type FormEvent, Fragment, type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { GROUP_ROWS } from '@/components/page';
import { ServiceIcon } from '@/components/service-icon';
import { SortableList } from '@/components/sortable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { safeUrl } from '@/lib/markup';
import type { Project, ProjectLink } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import {
  MUSIC_SERVICES,
  normalizeUrl,
  OTHER_NAME_MAX,
  OTHER_SERVICE,
  type Service,
  serviceById,
  serviceForUrl,
  shortUrl,
} from '@/lib/services';
import { arrayMoveById } from '@/lib/stages';
import { cn } from '@/lib/utils';

// ссылки проекта в том порядке, который задал владелец
// Ссылки для показа: только http(s) и с известным сервисом. Поле links - JSON, сервер его не
// проверяет, поэтому javascript: и прочее, записанное в обход формы, не становится ссылкой.
export function projectLinks(project: Pick<Project, 'links'>): ProjectLink[] {
  return (project.links ?? []).filter((l) => l.url && safeUrl(l.url) && linkMeta(l));
}

// та же ссылка в списке: по значению, а не по объекту - после перечитывания проекта (правка
// соавтора, возврат на вкладку) объекты в списке новые
function indexOfLink(all: ReadonlyArray<ProjectLink>, link: ProjectLink): number {
  return all.findIndex(
    (l) => l.service === link.service && l.url === link.url && (l.name ?? '') === (link.name ?? ''),
  );
}

// сервис ссылки и подпись: у "другого" - своё название, без него - адрес сайта
export function linkMeta(link: ProjectLink): { service: Service; label: string } | null {
  if (link.service === OTHER_SERVICE.id) {
    let host = '';
    try {
      host = new URL(link.url).hostname.replace(/^www\./, '');
    } catch {
      host = shortUrl(link.url);
    }
    return { service: OTHER_SERVICE, label: link.name?.trim() || host };
  }
  const s = serviceById(MUSIC_SERVICES, link.service);
  return s ? { service: s, label: s.name } : null;
}

const ROW = 'flex min-h-12 items-center gap-3 px-4 transition-colors md:min-h-11';

// Ссылки в настройках: только добавленные - название и кнопка перехода, порядок меняется
// перетаскиванием (так же они идут на странице проекта); сам адрес виден и правится в окне,
// где сервис узнаётся по вставленной ссылке сам. "Другое" - со своим названием, таких
// ссылок может быть несколько.
export function ProjectLinksEditor({ project, editable }: { project: Project; editable: boolean }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<ProjectLink | 'new' | null>(null);
  const all = project.links ?? [];
  const links = projectLinks(project);

  const save = useMutation({
    mutationFn: (next: ProjectLink[]) =>
      collection(pb, 'projects').update(project.id, { links: next }),
    onSettled: () => client.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => toast.error('Ссылка не сохранилась: проверьте соединение'),
  });

  // правка заменяет прежнюю запись; у сервиса из списка ссылка одна - старая уходит
  function put(link: ProjectLink, before: ProjectLink | null) {
    const at = before ? indexOfLink(all, before) : -1;
    const keep = (l: ProjectLink, i: number) =>
      i !== at && (link.service === OTHER_SERVICE.id || l.service !== link.service);
    const next = all.filter(keep);
    // на место прежней: столько оставшихся ссылок, сколько стояло перед ней
    const pos = at >= 0 ? all.slice(0, at).filter(keep).length : next.length;
    next.splice(pos, 0, link);
    save.mutate(next);
  }
  const drop = (link: ProjectLink) => {
    const at = indexOfLink(all, link);
    if (at >= 0) save.mutate(all.filter((_, i) => i !== at));
  };

  // для перетаскивания: свой id у каждой ссылки, одинаковые "другие" различаются номером
  const items = links.map((link, i) => ({ id: `${i}:${link.service}:${link.url}`, link }));
  const reorder = (from: string, to: string) =>
    save.mutate(arrayMoveById(items, from, to).map((x) => x.link));

  const row = (l: ProjectLink, handle: ReactNode) => {
    const meta = linkMeta(l);
    if (!meta) return null;
    return (
      <div className={cn(ROW, editable && 'group/row pl-1 hover:bg-groove/30')}>
        {handle}
        <ServiceIcon service={meta.service} className="text-dim" />
        {editable ? (
          <button
            type="button"
            onClick={() => setEditing(l)}
            className="flex min-h-12 min-w-0 flex-1 items-center text-left md:min-h-11"
            aria-label={`Изменить ссылку: ${meta.label}`}
          >
            <span className="truncate">{meta.label}</span>
          </button>
        ) : (
          <span className="min-w-0 flex-1 truncate">{meta.label}</span>
        )}
        {/* подсвечивается только знаком: подложка - одна на всю строку, как у этапов */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="-mr-2 text-dim hover:bg-transparent hover:text-ink dark:hover:bg-transparent"
          asChild
        >
          <a
            href={safeUrl(l.url) ?? undefined}
            target="_blank"
            rel="noreferrer"
            aria-label={`Открыть: ${meta.label}`}
          >
            <ExternalLink />
          </a>
        </Button>
      </div>
    );
  };

  return (
    <>
      <div className={GROUP_ROWS}>
        {editable && items.length > 0 ? (
          <SortableList
            items={items}
            onReorder={reorder}
            className="divide-y divide-border/70 dark:divide-border/50"
            handleClassName="-mr-1 h-12 w-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:opacity-100"
          >
            {(x, handle) => row(x.link, handle)}
          </SortableList>
        ) : (
          items.map((x) => <div key={x.id}>{row(x.link, null)}</div>)
        )}
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
        taken={links.map((l) => l.service).filter((id) => id !== OTHER_SERVICE.id)}
        onClose={() => setEditing(null)}
        onSave={put}
        onDelete={drop}
      />
    </>
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
  // сервисы из списка, у которых ссылка уже есть
  taken: ReadonlyArray<string>;
  onClose: () => void;
  onSave: (link: ProjectLink, before: ProjectLink | null) => void;
  onDelete: (link: ProjectLink) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="overflow-y-auto sm:max-w-lg">
        {open && (
          <LinkForm
            key={link ? `${link.service}-${link.url}` : 'new'}
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
  const [name, setName] = useState(link?.name ?? '');
  // сервис, выбранный руками, ссылка уже не меняет
  const [chosen, setChosen] = useState(Boolean(link));
  const [deleting, setDeleting] = useState(false);
  const normalized = normalizeUrl(url);
  const other = service === OTHER_SERVICE.id;
  const free = (id: string) =>
    id === OTHER_SERVICE.id || id === link?.service || !taken.includes(id);
  const ready =
    normalized !== null && service !== '' && free(service) && (!other || name.trim() !== '');

  function change(v: string) {
    setUrl(v);
    if (chosen) return;
    const n = normalizeUrl(v);
    if (!n) return;
    // ссылка не на сервис из списка - значит "другое"
    const found = serviceForUrl(MUSIC_SERVICES, n);
    setService(found && free(found.id) ? found.id : OTHER_SERVICE.id);
  }

  function choose(id: string) {
    setService(id);
    setChosen(true);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || !normalized) return;
    onSave(
      other ? { service, url: normalized, name: name.trim() } : { service, url: normalized },
      link,
    );
    onClose();
  }

  const title = link ? (linkMeta(link)?.label ?? 'Ссылка') : 'Новая ссылка';
  const picked = [...MUSIC_SERVICES, OTHER_SERVICE].find((x) => x.id === service);

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="break-words">{title}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-url" className="sr-only">
          Ссылка
        </Label>
        {/* слева сервис (сам находится по адресу, можно выбрать), справа адрес: поле растёт по
            ссылке, она видна целиком */}
        <div className="flex items-start gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-label={`Сервис: ${picked?.name ?? 'не выбран'}`}
                title={picked?.name}
                className="h-10 shrink-0 gap-1.5 px-2.5 font-normal"
              >
                {picked ? (
                  <ServiceIcon service={picked} className="size-4" />
                ) : (
                  <span className="text-dim">Сервис</span>
                )}
                <ChevronDown className="size-4 shrink-0 text-dim" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 min-w-52 overflow-y-auto">
              {[...MUSIC_SERVICES, OTHER_SERVICE].map((x) => (
                <Fragment key={x.id}>
                  {x.id === OTHER_SERVICE.id && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    disabled={!free(x.id)}
                    onSelect={() => choose(x.id)}
                    className="gap-2.5"
                  >
                    <ServiceIcon service={x} className="size-4" />
                    <span className="flex-1 truncate">{x.name}</span>
                    {x.id === service ? (
                      <Check className="size-4 shrink-0" />
                    ) : (
                      !free(x.id) && <span className="text-xs text-dim">уже есть</span>
                    )}
                  </DropdownMenuItem>
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Textarea
            id="link-url"
            inputMode="url"
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            rows={1}
            placeholder="https://music.yandex.ru/..."
            value={url}
            onChange={(e) => change(e.target.value.replace(/\s+/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            aria-invalid={url.trim() !== '' && normalized === null}
            className="min-h-10 min-w-0 flex-1 resize-none py-2 break-all"
          />
        </div>
      </div>
      {other && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="link-name">Название</Label>
          <Input
            id="link-name"
            maxLength={OTHER_NAME_MAX}
            placeholder="Bandcamp, сайт группы..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}
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
          title={`Удалить ссылку «${title}»?`}
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
      {links.map((l, i) => {
        const meta = linkMeta(l);
        if (!meta) return null;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: у "другого" может совпасть и сервис, и адрес
          <li key={`${l.service}-${i}`}>
            <a
              href={safeUrl(l.url) ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="group/brand flex h-10 items-center gap-2 rounded-full bg-panel px-3.5 text-sm text-dim ring-1 ring-border/70 transition-colors hover:text-ink md:h-9 dark:bg-white/5 dark:ring-border/40"
            >
              <ServiceIcon service={meta.service} brandOnHover className="size-[1.125rem]" />
              {meta.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
