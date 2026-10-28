import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ChevronDown, ImagePlus, Trash2 } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AddInline } from '@/components/add-inline';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useProjectCrumbs } from '@/components/crumbs';
import { ProjectAvatar } from '@/components/images';
import { MembersPicker } from '@/components/members-picker';
import { PageHeader, SectionTitle } from '@/components/page';
import { SortableList } from '@/components/sortable';
import { SubstepsEditor } from '@/components/substeps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/lib/auth';
import { fileSize } from '@/lib/format';
import { MAX_IMAGE_BYTES, type Project, type StageTemplate } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { projectQuery, templatesQuery } from '@/lib/queries';
import { arrayMoveById, nextPosition, savePositions } from '@/lib/stages';
import { cn } from '@/lib/utils';

export function ProjectSettingsPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/settings' });
  const me = useMe();
  const project = useQuery(projectQuery(projectId));
  const crumbs = useProjectCrumbs(projectId);
  const owner = project.data?.owner === me?.id;

  return (
    <>
      <PageHeader crumbs={crumbs} title="Настройки проекта" />
      {project.isPending && <Skeleton className="h-60 rounded-xl" />}
      {project.data && (
        <div className="grid max-w-5xl gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-10">
            <General project={project.data} owner={owner} />
            <Members project={project.data} owner={owner} />
          </div>
          <Template projectId={projectId} />
          {owner && (
            <div className="lg:col-span-2">
              <DeleteProject project={project.data} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function General({ project, owner }: { project: Project; owner: boolean }) {
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(project.name);
  useEffect(() => setName(project.name), [project.name]);
  const refresh = () => client.invalidateQueries({ queryKey: ['projects'] });

  const save = useMutation({
    mutationFn: (data: FormData | Record<string, string>) =>
      collection(pb, 'projects').update(project.id, data),
    onSuccess: refresh,
    onError: () => toast.error('Не сохранилось: проверьте соединение и размер картинки'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim() && name.trim() !== project.name) save.mutate({ name: name.trim() });
  }

  function pickAvatar(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error(`Картинка больше ${fileSize(MAX_IMAGE_BYTES)} не загрузится`);
      return;
    }
    const form = new FormData();
    form.set('avatar', f);
    save.mutate(form);
  }

  return (
    <section className="flex flex-col gap-5">
      <SectionTitle>Проект</SectionTitle>
      <div className="flex items-center gap-4">
        <ProjectAvatar project={project} className="size-20 rounded-2xl text-3xl" />
        {owner && (
          <div className="flex flex-col gap-1">
            <Button
              variant="secondary"
              disabled={save.isPending}
              onClick={() => input.current?.click()}
            >
              <ImagePlus data-icon="inline-start" />
              {project.avatar ? 'Заменить картинку' : 'Загрузить картинку'}
            </Button>
            {project.avatar && (
              <Button
                variant="ghost"
                disabled={save.isPending}
                onClick={() => save.mutate({ avatar: '' })}
              >
                Убрать картинку
              </Button>
            )}
          </div>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            pickAvatar(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <Label htmlFor="project-name">Название</Label>
        <div className="flex gap-2">
          <Input
            id="project-name"
            required
            maxLength={120}
            value={name}
            disabled={!owner || save.isPending}
            onChange={(e) => setName(e.target.value)}
          />
          {owner && (
            <Button
              type="submit"
              variant="secondary"
              className="h-11"
              disabled={save.isPending || !name.trim() || name.trim() === project.name}
            >
              Сохранить
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

function Members({ project, owner }: { project: Project; owner: boolean }) {
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (members: string[]) => collection(pb, 'projects').update(project.id, { members }),
    onSettled: () => client.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => toast.error('Участники не сохранились: проверьте соединение'),
  });
  return (
    <section>
      <SectionTitle>Участники</SectionTitle>
      <MembersPicker
        ownerId={project.owner}
        value={project.members ?? []}
        onChange={(m) => save.mutate(m)}
        disabled={!owner || save.isPending}
      />
    </section>
  );
}

function Template({ projectId }: { projectId: string }) {
  const client = useQueryClient();
  const templates = useQuery(templatesQuery(projectId));
  const [open, setOpen] = useState<string>();
  const list = templates.data ?? [];
  const key = templatesQuery(projectId).queryKey;
  const refresh = () => client.invalidateQueries({ queryKey: ['stage_templates'] });

  const add = useMutation({
    mutationFn: (title: string) =>
      collection(pb, 'stage_templates').create({
        project: projectId,
        title,
        position: nextPosition(list),
        substeps: [],
      }),
    onSuccess: refresh,
    onError: () => toast.error('Этап не добавлен: проверьте соединение'),
  });

  function reorder(from: string, to: string) {
    const ordered = arrayMoveById(list, from, to);
    client.setQueryData<StageTemplate[]>(
      key,
      ordered.map((t, i) => ({ ...t, position: i })),
    );
    void savePositions(pb, 'stage_templates', ordered)
      .catch(() => toast.error('Порядок не сохранился: проверьте соединение'))
      .finally(refresh);
  }

  return (
    <section>
      <SectionTitle>Этапы новых песен</SectionTitle>
      {templates.isPending && <Skeleton className="h-24 rounded-xl" />}
      <SortableList items={list} onReorder={reorder} className="mb-3 flex flex-col gap-2">
        {(t, handle) => (
          <TemplateRow
            template={t}
            handle={handle}
            open={open === t.id}
            onToggle={() => setOpen(open === t.id ? undefined : t.id)}
          />
        )}
      </SortableList>
      <AddInline
        id="new-template-stage"
        placeholder="Новый этап"
        busy={add.isPending}
        onAdd={(t) => add.mutateAsync(t)}
      />
    </section>
  );
}

function TemplateRow({
  template,
  handle,
  open,
  onToggle,
}: {
  template: StageTemplate;
  handle: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  const client = useQueryClient();
  const [title, setTitle] = useState(template.title);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setTitle(template.title), [template.title]);
  const refresh = () => client.invalidateQueries({ queryKey: ['stage_templates'] });
  const subs = template.substeps ?? [];

  const save = useMutation({
    mutationFn: (patch: Partial<Pick<StageTemplate, 'title' | 'substeps'>>) =>
      collection(pb, 'stage_templates').update(template.id, patch),
    onSettled: refresh,
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });
  const remove = useMutation({
    mutationFn: () => collection(pb, 'stage_templates').delete(template.id),
    onSuccess: refresh,
    onError: () => toast.error('Этап не удалён: проверьте соединение'),
  });

  return (
    <div className="rounded-xl bg-panel">
      <div className="flex items-center gap-1 p-1">
        {handle}
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left hover:bg-groove/50"
        >
          <span className="min-w-0 flex-1 truncate">{template.title}</span>
          {subs.length > 0 && (
            <span className="shrink-0 text-xs text-dim">{subs.length} подэт.</span>
          )}
          <ChevronDown
            className={cn('size-4 shrink-0 text-dim transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-4 border-t px-3 pt-3 pb-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim() && title.trim() !== template.title)
                save.mutate({ title: title.trim() });
            }}
          >
            <label htmlFor={`tpl-title-${template.id}`} className="sr-only">
              Название этапа
            </label>
            <Input
              id={`tpl-title-${template.id}`}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Button
              type="submit"
              variant="secondary"
              className="h-11"
              disabled={!title.trim() || title.trim() === template.title || save.isPending}
            >
              Сохранить
            </Button>
          </form>
          <div>
            <p className="mb-2 text-sm font-medium">Подэтапы</p>
            <SubstepsEditor
              idPrefix={`tpl-${template.id}`}
              checkable={false}
              items={subs}
              onChange={(items) => {
                client.setQueryData<StageTemplate[]>(['stage_templates', template.project], (old) =>
                  old?.map((t) =>
                    t.id === template.id
                      ? { ...t, substeps: items.map((x) => ({ id: x.id, title: x.title })) }
                      : t,
                  ),
                );
                save.mutate({ substeps: items.map((x) => ({ id: x.id, title: x.title })) });
              }}
            />
          </div>
          <div>
            <Button variant="destructive" onClick={() => setConfirming(true)}>
              <Trash2 data-icon="inline-start" />
              Удалить этап
            </Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Удалить этап "${template.title}" из шаблона?`}
        description="Песни, которые уже созданы, не изменятся."
        confirm="Удалить"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}

function DeleteProject({ project }: { project: Project }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: () => collection(pb, 'projects').delete(project.id),
    onSuccess: async () => {
      setConfirming(false);
      await navigate({ to: '/projects' });
      await client.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Проект не удалён: проверьте соединение'),
  });
  return (
    <section>
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        <Trash2 data-icon="inline-start" />
        Удалить проект
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Удалить проект "${project.name}"?`}
        description="Удалятся все песни, этапы, тексты, обложки и заметки проекта."
        confirm="Удалить навсегда"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </section>
  );
}
