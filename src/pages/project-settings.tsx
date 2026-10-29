import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ChevronRight, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { AddRow } from '@/components/add-inline';
import { AutosaveInput } from '@/components/autosave-input';
import { Collapse } from '@/components/collapse';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useProjectCrumbs } from '@/components/crumbs';
import { ProjectAvatar, useFieldUpload } from '@/components/images';
import { InlineTitle } from '@/components/inline-title';
import { MembersPicker } from '@/components/members-picker';
import { GROUP_ROWS, PageHeader, Section } from '@/components/page';
import { ProjectLinksEditor } from '@/components/project-links';
import { PromoTemplate } from '@/components/promo-template';
import { SortableList } from '@/components/sortable';
import { SubstepsEditor } from '@/components/substeps';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccess } from '@/lib/access';
import type { Project, StageTemplate } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { type Roles, roleFields } from '@/lib/projects';
import { projectQuery, templatesQuery } from '@/lib/queries';
import { arrayMoveById, nextPosition, savePositions } from '@/lib/stages';
import { cn } from '@/lib/utils';

export function ProjectSettingsPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/settings' });
  const project = useQuery(projectQuery(projectId));
  const crumbs = useProjectCrumbs(projectId);
  const access = useAccess(projectId);
  const owner = access.manage;
  const client = useQueryClient();
  const rename = useMutation({
    mutationFn: (name: string) => collection(pb, 'projects').update(projectId, { name }),
    onSettled: () => client.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => toast.error('Название не сохранилось: проверьте соединение'),
  });
  const name = project.data?.name ?? '';

  return (
    <>
      {/* название - крупно: сразу видно, какой проект настраиваем; владелец правит его здесь же */}
      <PageHeader
        crumbs={crumbs}
        title={
          owner && project.data ? (
            <InlineTitle
              value={name}
              label="Переименовать проект"
              maxLength={120}
              onSave={(v) => rename.mutate(v)}
            />
          ) : (
            name
          )
        }
        meta="Настройки проекта"
      />
      {project.isPending && <Skeleton className="h-60 rounded-xl" />}
      {project.data && (
        <div className="grid max-w-5xl grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-8">
            <General project={project.data} owner={owner} />
            <Section title="Участники">
              <Members project={project.data} owner={owner} />
            </Section>
            <Section title="Ссылки">
              <ProjectLinksEditor project={project.data} editable={owner} />
            </Section>
          </div>
          <div className="flex flex-col gap-8">
            <Template projectId={projectId} editable={access.edit} />
            <PromoTemplate projectId={projectId} editable={access.edit} />
          </div>
          {owner && <DeleteProject project={project.data} />}
        </div>
      )}
    </>
  );
}

function General({ project, owner }: { project: Project; owner: boolean }) {
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (data: FormData | Record<string, string>) =>
      collection(pb, 'projects').update(project.id, data),
    onSettled: () => client.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => toast.error('Не сохранилось: проверьте соединение и размер картинки'),
  });

  const avatar = useFieldUpload({
    record: project,
    field: 'avatar',
    thumbs: ['256x256'],
    refresh: ['projects'],
  });

  return (
    <Section title="Проект">
      <div className={GROUP_ROWS}>
        <div className="flex items-center gap-4 px-4 py-4">
          <ProjectAvatar
            project={project}
            interactive
            onPick={owner ? avatar.pick : undefined}
            pending={avatar.pending}
            replace={owner}
            onRemove={owner ? () => save.mutate({ avatar: '' }) : undefined}
            className="size-16 rounded-2xl text-2xl"
          />
        </div>
      </div>
    </Section>
  );
}

function Members({ project, owner }: { project: Project; owner: boolean }) {
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (roles: Roles) =>
      collection(pb, 'projects').update(project.id, roleFields(project.owner, roles)),
    onSettled: () => client.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => toast.error('Участники не сохранились: проверьте соединение'),
  });
  const value: Roles = {
    editor: project.editors ?? [],
    contributor: project.contributors ?? [],
    viewer: project.viewers ?? [],
  };
  return (
    <MembersPicker
      ownerId={project.owner}
      value={value}
      onChange={(roles) => save.mutate(roles)}
      readOnly={!owner}
      disabled={save.isPending}
    />
  );
}

function Template({ projectId, editable }: { projectId: string; editable: boolean }) {
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
    <Section title="Этапы новых песен">
      {templates.isPending && <Skeleton className="h-24 rounded-xl" />}
      {!editable && (
        <ul className={GROUP_ROWS}>
          {list.map((t) => (
            <li key={t.id} className="flex min-h-12 items-center gap-3 px-4 md:min-h-11">
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              {(t.substeps ?? []).length > 0 && (
                <span className="shrink-0 text-sm text-dim">
                  {(t.substeps ?? []).length} подэт.
                </span>
              )}
            </li>
          ))}
          {templates.isSuccess && list.length === 0 && (
            <li className="px-4 py-3 text-sm text-dim">Этапов нет</li>
          )}
        </ul>
      )}
      {editable && (
        <div className={GROUP_ROWS}>
          {list.length > 0 && (
            <SortableList
              items={list}
              onReorder={reorder}
              className="divide-y divide-border/70 dark:divide-border/50"
              handleClassName="mr-1 h-12 w-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100"
            >
              {(t, handle) => (
                <TemplateRow
                  template={t}
                  handle={handle}
                  open={open === t.id}
                  onToggle={() => setOpen(open === t.id ? undefined : t.id)}
                />
              )}
            </SortableList>
          )}
          <AddRow
            id="new-template-stage"
            label="Добавить этап"
            busy={add.isPending}
            onAdd={(t) => add.mutateAsync(t)}
          />
        </div>
      )}
    </Section>
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
  const [confirming, setConfirming] = useState(false);
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
    <div className="group/row">
      <div className="flex items-center pl-1 transition-colors hover:bg-groove/30">
        {handle}
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 pr-3 text-left md:min-h-11"
        >
          <span className="min-w-0 flex-1 truncate">{template.title}</span>
          {subs.length > 0 && (
            <span className="shrink-0 text-sm text-dim">{subs.length} подэт.</span>
          )}
          <ChevronRight
            className={cn('size-4 shrink-0 text-dim/60 transition-transform', open && 'rotate-90')}
          />
        </button>
      </div>
      <Collapse open={open}>
        <div className="flex flex-col gap-3 bg-console/50 px-4 pt-2 pb-4 dark:bg-console/40">
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm text-dim">Название</span>
            <AutosaveInput
              id={`tpl-title-${template.id}`}
              required
              maxLength={120}
              value={template.title}
              className="text-left"
              onSave={(title) => save.mutate({ title })}
            />
          </div>
          <SubstepsEditor
            idPrefix={`tpl-${template.id}`}
            checkable={false}
            items={subs}
            onChange={(items) => {
              const next = items.map((x) => ({ id: x.id, title: x.title }));
              client.setQueryData<StageTemplate[]>(['stage_templates', template.project], (old) =>
                old?.map((t) => (t.id === template.id ? { ...t, substeps: next } : t)),
              );
              save.mutate({ substeps: next });
            }}
          />
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-9 px-2 text-led-red hover:bg-led-red/10 hover:text-led-red"
              onClick={() => setConfirming(true)}
            >
              <Trash2 data-icon="inline-start" />
              Убрать из шаблона
            </Button>
          </div>
        </div>
      </Collapse>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Убрать "${template.title}" из шаблона?`}
        description="Песни, которые уже созданы, не изменятся."
        confirm="Убрать"
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
    <div className="lg:col-span-2">
      <Button
        variant="ghost"
        className="-ml-3.5 text-led-red hover:bg-led-red/10 hover:text-led-red"
        onClick={() => setConfirming(true)}
      >
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
    </div>
  );
}
