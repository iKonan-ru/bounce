import { ChevronRight, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Project, Roles } from '@/entities/project';
import {
  projectQuery,
  useAccess,
  ProjectAvatar,
  getRoleFields,
  ProjectRole,
} from '@/entities/project';
import type { StageTemplate, TemplateSubstep } from '@/entities/song';
import { templatesQuery } from '@/entities/song';
import { InlineTitle, AddRow } from '@/features/mentions';
import { ProjectLinksEditor } from '@/features/project-links';
import { MembersPicker } from '@/features/project-members';
import {
  getCollection,
  pb,
  Collections,
  queryKeys,
  savePositions,
} from '@/shared/api';
import { GROUP_ROWS, SAVE_FAILED } from '@/shared/constants';
import { useFieldUpload } from '@/shared/hooks';
import type { Crumb, PendingImage } from '@/shared/types';
import {
  PageHeader,
  Loading,
  Section,
  SortableList,
  Collapse,
  AutosaveInput,
  Button,
  ConfirmDialog,
} from '@/shared/ui';
import { getNextPosition, moveItemById, cn } from '@/shared/utils';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import { SubstepsEditor } from '@/widgets/plan';
import { PromoTemplate } from '@/widgets/promo-template';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';

/** Id маршрута настроек проекта */
const SETTINGS_ROUTE_ID = '/app/p/$projectId/settings';

/** Предел длины названия проекта и названия этапа */
const TITLE_MAX_LENGTH = 120;

/** Поле картинки проекта */
const AVATAR_FIELD = 'avatar';

/** Размеры уменьшенных копий картинки проекта, которые готовятся заранее */
const AVATAR_THUMBS: readonly string[] = ['256x256'];

/** Правка проекта, которая убирает картинку */
const AVATAR_REMOVE_PATCH: Record<string, string> = { [AVATAR_FIELD]: '' };

/** Результат хука страницы настроек проекта */
interface UseProjectSettingsPageResult {
  projectId: string;
  project: Project | undefined;
  isPending: boolean;
  crumbs: Crumb[];
  /** Владелец: правит название, картинку, участников и ссылки, может удалить проект */
  isOwner: boolean;
  canEdit: boolean;
  /** Название правится прямо в шапке */
  isTitleEditable: boolean;
  name: string;
  onNameSave: (name: string) => void;
}

/** Пропсы картинки проекта в шапке настроек */
interface ProjectAvatarEditorProps {
  project: Project;
  isOwner: boolean;
}

/** Результат хука картинки проекта: что можно делать с картинкой */
interface UseProjectAvatarEditorResult {
  onAvatarPick: ((file: File) => void) | undefined;
  onAvatarRemove: (() => void) | undefined;
  pendingAvatar: PendingImage | undefined;
}

/** Пропсы участников проекта */
interface MembersProps {
  project: Project;
  isOwner: boolean;
}

/** Результат хука участников проекта */
interface UseMembersResult {
  roles: Roles;
  isSaving: boolean;
  onRolesChange: (roles: Roles) => void;
}

/** Пропсы шаблона этапов */
interface TemplateProps {
  projectId: string;
  isEditable: boolean;
}

/** Результат хука шаблона этапов */
interface UseTemplateResult {
  templates: UseQueryResult<StageTemplate[]>;
  templateList: StageTemplate[];
  openTemplateId: string | undefined;
  isAdding: boolean;
  hasTemplates: boolean;
  isEmpty: boolean;
  onTemplatesReorder: (from: string, to: string) => void;
  onTemplateAdd: (title: string) => Promise<unknown>;
  handleTemplateToggle: (templateId: string) => void;
}

/** Пропсы этапа шаблона только для чтения */
interface TemplateItemProps {
  template: StageTemplate;
}

/** Пропсы строки этапа шаблона */
interface TemplateRowProps {
  template: StageTemplate;
  /** Ручка перетаскивания */
  handle: ReactNode;
  isOpen: boolean;
  onToggle: (templateId: string) => void;
}

/** Результат хука строки этапа шаблона */
interface UseTemplateRowResult {
  substeps: TemplateSubstep[];
  isConfirming: boolean;
  setIsConfirming: (isConfirming: boolean) => void;
  isRemoving: boolean;
  onToggleClick: () => void;
  onTitleSave: (title: string) => void;
  onSubstepsChange: (substeps: readonly TemplateSubstep[]) => void;
  onRemoveClick: () => void;
  onRemoveConfirm: () => void;
}

/** Пропсы удаления проекта */
interface DeleteProjectProps {
  project: Project;
}

/** Результат хука удаления проекта */
interface UseDeleteProjectResult {
  isConfirming: boolean;
  setIsConfirming: (isConfirming: boolean) => void;
  isRemoving: boolean;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}

/** Данные и переименование проекта для страницы настроек */
function useProjectSettingsPage(): UseProjectSettingsPageResult {
  const { projectId } = useParams({ from: SETTINGS_ROUTE_ID });
  const project = useQuery(projectQuery(projectId));
  const crumbs = useProjectCrumbs(projectId);
  const access = useAccess(projectId);
  const queryClient = useQueryClient();
  const renameProject = useMutation({
    mutationFn: (name: string) =>
      getCollection(pb, Collections.Projects).update(projectId, { name }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: () => toast.error('Название не сохранилось: проверьте соединение'),
  });
  const isOwner = access.canManage;
  const isTitleEditable = isOwner && project.data !== undefined;

  const onNameSave = (name: string): void => {
    renameProject.mutate(name);
  };

  return {
    projectId,
    project: project.data,
    isPending: project.isPending,
    crumbs,
    isOwner,
    canEdit: access.canEdit,
    isTitleEditable,
    name: project.data?.name ?? '',
    onNameSave,
  };
}

/** Настройки проекта: название, картинка, участники, ссылки, шаблоны этапов и продвижения */
export function ProjectSettingsPage(): ReactNode {
  const {
    projectId,
    project,
    isPending,
    crumbs,
    isOwner,
    canEdit,
    isTitleEditable,
    name,
    onNameSave,
  } = useProjectSettingsPage();

  const editableTitle = (
    <InlineTitle
      value={name}
      label="Переименовать проект"
      maxLength={TITLE_MAX_LENGTH}
      onSave={onNameSave}
    />
  );
  const title = isTitleEditable ? editableTitle : name;
  const headerMedia = project && (
    <ProjectAvatarEditor project={project} isOwner={isOwner} />
  );

  return (
    <>
      {/* картинка и название - крупно: сразу видно, какой проект настраиваем; владелец правит их здесь же */}
      <PageHeader
        crumbs={crumbs}
        media={headerMedia}
        title={title}
        meta="Настройки проекта"
      />
      {isPending && <Loading className="h-60 rounded-xl" />}
      {project && (
        <div className="grid max-w-5xl grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-8">
            <Section title="Участники">
              <Members project={project} isOwner={isOwner} />
            </Section>
            <Section title="Ссылки">
              <ProjectLinksEditor project={project} isEditable={isOwner} />
            </Section>
          </div>
          <div className="flex flex-col gap-8">
            <Template projectId={projectId} isEditable={canEdit} />
            <PromoTemplate projectId={projectId} canEdit={canEdit} />
          </div>
          {isOwner && <DeleteProject project={project} />}
        </div>
      )}
    </>
  );
}

/** Загрузка и удаление картинки проекта (только владелец) */
function useProjectAvatarEditor({
  project,
  isOwner,
}: ProjectAvatarEditorProps): UseProjectAvatarEditorResult {
  const queryClient = useQueryClient();
  const saveProject = useMutation({
    mutationFn: (patch: FormData | Record<string, string>) =>
      getCollection(pb, Collections.Projects).update(project.id, patch),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: () =>
      toast.error('Не сохранилось: проверьте соединение и размер картинки'),
  });
  const avatar = useFieldUpload({
    record: project,
    field: AVATAR_FIELD,
    thumbs: AVATAR_THUMBS,
    refresh: queryKeys.projects.all,
  });

  const handleAvatarRemove = (): void => {
    saveProject.mutate(AVATAR_REMOVE_PATCH);
  };

  if (!isOwner) {
    return {
      onAvatarPick: undefined,
      onAvatarRemove: undefined,
      pendingAvatar: avatar.pending,
    };
  }

  return {
    onAvatarPick: avatar.pick,
    onAvatarRemove: handleAvatarRemove,
    pendingAvatar: avatar.pending,
  };
}

/** Картинка проекта в шапке настроек: владелец загружает, заменяет и убирает её */
function ProjectAvatarEditor({
  project,
  isOwner,
}: ProjectAvatarEditorProps): ReactNode {
  const { onAvatarPick, onAvatarRemove, pendingAvatar } =
    useProjectAvatarEditor({
      project,
      isOwner,
    });

  return (
    <ProjectAvatar
      project={project}
      isInteractive
      onPick={onAvatarPick}
      pending={pendingAvatar}
      canReplace={isOwner}
      onRemove={onAvatarRemove}
      className="size-12 rounded-xl text-lg"
    />
  );
}

/** Роли участников проекта и их сохранение */
function useMembers(project: Project): UseMembersResult {
  const queryClient = useQueryClient();
  const saveRoles = useMutation({
    mutationFn: (roles: Roles) =>
      getCollection(pb, Collections.Projects).update(
        project.id,
        getRoleFields(project.owner, roles)
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: () =>
      toast.error('Участники не сохранились: проверьте соединение'),
  });
  const roles: Roles = {
    [ProjectRole.Editor]: project.editors ?? [],
    [ProjectRole.Contributor]: project.contributors ?? [],
    [ProjectRole.Viewer]: project.viewers ?? [],
  };

  const onRolesChange = (nextRoles: Roles): void => {
    saveRoles.mutate(nextRoles);
  };

  return { roles, isSaving: saveRoles.isPending, onRolesChange };
}

/** Участники проекта: роли меняет только владелец */
function Members({ project, isOwner }: MembersProps): ReactNode {
  const { roles, isSaving, onRolesChange } = useMembers(project);

  return (
    <MembersPicker
      ownerId={project.owner}
      value={roles}
      onChange={onRolesChange}
      readOnly={!isOwner}
      disabled={isSaving}
    />
  );
}

/** Этапы шаблона: добавление, порядок и раскрытая строка */
function useTemplate(projectId: string): UseTemplateResult {
  const queryClient = useQueryClient();
  const templates = useQuery(templatesQuery(projectId));
  const [openTemplateId, setOpenTemplateId] = useState<string>();
  const templateList = templates.data ?? [];
  const templatesKey = templatesQuery(projectId).queryKey;
  const hasTemplates = templateList.length > 0;
  const isEmpty = templates.isSuccess && !hasTemplates;

  const refreshTemplates = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.stageTemplates.all });

  const addTemplate = useMutation({
    mutationFn: (title: string) =>
      getCollection(pb, Collections.StageTemplates).create({
        project: projectId,
        title,
        position: getNextPosition(templateList),
        substeps: [],
      }),
    onSuccess: refreshTemplates,
    onError: () => toast.error('Этап не добавлен: проверьте соединение'),
  });

  const onTemplatesReorder = (from: string, to: string): void => {
    const ordered = moveItemById(templateList, from, to);
    queryClient.setQueryData<StageTemplate[]>(
      templatesKey,
      ordered.map((template, index) => ({ ...template, position: index }))
    );
    void savePositions(pb, Collections.StageTemplates, ordered)
      .catch(() => toast.error('Порядок не сохранился: проверьте соединение'))
      .finally(refreshTemplates);
  };

  const onTemplateAdd = (title: string): Promise<unknown> =>
    addTemplate.mutateAsync(title);

  const handleTemplateToggle = (templateId: string): void => {
    if (openTemplateId === templateId) {
      setOpenTemplateId(undefined);

      return;
    }

    setOpenTemplateId(templateId);
  };

  return {
    templates,
    templateList,
    openTemplateId,
    isAdding: addTemplate.isPending,
    hasTemplates,
    isEmpty,
    onTemplatesReorder,
    onTemplateAdd,
    handleTemplateToggle,
  };
}

/** Этапы, с которыми создаются новые песни проекта */
function Template({ projectId, isEditable }: TemplateProps): ReactNode {
  const {
    templates,
    templateList,
    openTemplateId,
    isAdding,
    hasTemplates,
    isEmpty,
    onTemplatesReorder,
    onTemplateAdd,
    handleTemplateToggle,
  } = useTemplate(projectId);

  const renderTemplateRow = (
    template: StageTemplate,
    handle: ReactNode
  ): ReactNode => {
    const isOpen = openTemplateId === template.id;

    return (
      <TemplateRow
        template={template}
        handle={handle}
        isOpen={isOpen}
        onToggle={handleTemplateToggle}
      />
    );
  };

  return (
    <Section title="Этапы новых песен">
      {templates.isPending && <Loading className="h-24 rounded-xl" />}
      {!isEditable && (
        <ul className={GROUP_ROWS}>
          {templateList.map((template) => (
            <TemplateItem key={template.id} template={template} />
          ))}
          {isEmpty && (
            <li className="px-4 py-3 text-sm text-dim">Этапов нет</li>
          )}
        </ul>
      )}
      {isEditable && (
        <div className={GROUP_ROWS}>
          {hasTemplates && (
            <SortableList
              items={templateList}
              onReorder={onTemplatesReorder}
              className="divide-y divide-border/70 dark:divide-border/50"
              handleClassName="mr-1 h-12 w-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:opacity-100"
            >
              {renderTemplateRow}
            </SortableList>
          )}
          <AddRow
            id="new-template-stage"
            label="Добавить этап"
            isBusy={isAdding}
            onAdd={onTemplateAdd}
          />
        </div>
      )}
    </Section>
  );
}

/** Этап шаблона только для чтения: название и число подэтапов */
function TemplateItem({ template }: TemplateItemProps): ReactNode {
  const substepCount = (template.substeps ?? []).length;
  const hasSubsteps = substepCount > 0;

  return (
    <li className="flex min-h-12 items-center gap-3 px-4 md:min-h-11">
      <span className="min-w-0 flex-1 truncate">{template.title}</span>
      {hasSubsteps && (
        <span className="shrink-0 text-sm text-dim">{substepCount} подэт.</span>
      )}
    </li>
  );
}

/** Правка, подэтапы и удаление этапа шаблона */
function useTemplateRow(
  template: StageTemplate,
  onToggle: (templateId: string) => void
): UseTemplateRowResult {
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const substeps = template.substeps ?? [];

  const refreshTemplates = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.stageTemplates.all });

  const saveTemplate = useMutation({
    mutationFn: (patch: Partial<Pick<StageTemplate, 'title' | 'substeps'>>) =>
      getCollection(pb, Collections.StageTemplates).update(template.id, patch),
    onSettled: refreshTemplates,
    onError: () => toast.error(SAVE_FAILED),
  });
  const removeTemplate = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.StageTemplates).delete(template.id),
    onSuccess: refreshTemplates,
    onError: () => toast.error('Этап не удалён: проверьте соединение'),
  });

  const onToggleClick = (): void => {
    onToggle(template.id);
  };

  const onTitleSave = (title: string): void => {
    saveTemplate.mutate({ title });
  };

  const onSubstepsChange = (changed: readonly TemplateSubstep[]): void => {
    const nextSubsteps = changed.map((substep) => ({
      id: substep.id,
      title: substep.title,
    }));
    const replaceSubsteps = (cached: StageTemplate): StageTemplate => {
      if (cached.id !== template.id) {
        return cached;
      }

      return { ...cached, substeps: nextSubsteps };
    };
    queryClient.setQueryData<StageTemplate[]>(
      queryKeys.stageTemplates.ofProject(template.project),
      (cachedList) => cachedList?.map(replaceSubsteps)
    );
    saveTemplate.mutate({ substeps: nextSubsteps });
  };

  const onRemoveClick = (): void => {
    setIsConfirming(true);
  };

  const onRemoveConfirm = (): void => {
    removeTemplate.mutate();
  };

  return {
    substeps,
    isConfirming,
    setIsConfirming,
    isRemoving: removeTemplate.isPending,
    onToggleClick,
    onTitleSave,
    onSubstepsChange,
    onRemoveClick,
    onRemoveConfirm,
  };
}

/** Строка этапа шаблона: раскрывается для правки названия и подэтапов */
function TemplateRow({
  template,
  handle,
  isOpen,
  onToggle,
}: TemplateRowProps): ReactNode {
  const {
    substeps,
    isConfirming,
    setIsConfirming,
    isRemoving,
    onToggleClick,
    onTitleSave,
    onSubstepsChange,
    onRemoveClick,
    onRemoveConfirm,
  } = useTemplateRow(template, onToggle);

  const hasSubsteps = substeps.length > 0;
  const chevronClassName = cn(
    'size-4 shrink-0 text-dim/60 transition-transform',
    {
      'rotate-90': isOpen,
    }
  );
  const titleInputId = `tpl-title-${template.id}`;
  const substepsIdPrefix = `tpl-${template.id}`;
  const confirmTitle = `Убрать "${template.title}" из шаблона?`;

  return (
    <div className="group/row">
      <div className="flex items-center pl-1 transition-colors hover:bg-groove/30">
        {handle}
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggleClick}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 pr-3 text-left md:min-h-11"
        >
          <span className="min-w-0 flex-1 truncate">{template.title}</span>
          {hasSubsteps && (
            <span className="shrink-0 text-sm text-dim">
              {substeps.length} подэт.
            </span>
          )}
          <ChevronRight className={chevronClassName} />
        </button>
      </div>
      <Collapse isOpen={isOpen}>
        <div className="flex flex-col gap-3 bg-console/50 px-4 pt-2 pb-4 dark:bg-console/40">
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm text-dim">Название</span>
            <AutosaveInput
              id={titleInputId}
              required
              maxLength={TITLE_MAX_LENGTH}
              value={template.title}
              className="text-left"
              onSave={onTitleSave}
            />
          </div>
          <SubstepsEditor
            idPrefix={substepsIdPrefix}
            isCheckable={false}
            items={substeps}
            onChange={onSubstepsChange}
          />
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-9 px-2 text-led-red hover:bg-led-red/10 hover:text-led-red"
              onClick={onRemoveClick}
            >
              <Trash2 data-icon="inline-start" />
              Убрать из шаблона
            </Button>
          </div>
        </div>
      </Collapse>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title={confirmTitle}
        description="Песни, которые уже созданы, не изменятся."
        confirmLabel="Убрать"
        isBusy={isRemoving}
        onConfirm={onRemoveConfirm}
      />
    </div>
  );
}

/** Удаление проекта с подтверждением и переходом к списку проектов */
function useDeleteProject(project: Project): UseDeleteProjectResult {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const removeProject = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.Projects).delete(project.id),
    onSuccess: async () => {
      setIsConfirming(false);
      await navigate({ to: '/projects' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: () => toast.error('Проект не удалён: проверьте соединение'),
  });

  const onDeleteClick = (): void => {
    setIsConfirming(true);
  };

  const onDeleteConfirm = (): void => {
    removeProject.mutate();
  };

  return {
    isConfirming,
    setIsConfirming,
    isRemoving: removeProject.isPending,
    onDeleteClick,
    onDeleteConfirm,
  };
}

/** Кнопка удаления проекта (только владелец) */
function DeleteProject({ project }: DeleteProjectProps): ReactNode {
  const {
    isConfirming,
    setIsConfirming,
    isRemoving,
    onDeleteClick,
    onDeleteConfirm,
  } = useDeleteProject(project);
  const confirmTitle = `Удалить проект "${project.name}"?`;

  return (
    <div className="lg:col-span-2">
      <Button
        variant="ghost"
        className="-ml-3.5 text-led-red hover:bg-led-red/10 hover:text-led-red"
        onClick={onDeleteClick}
      >
        <Trash2 data-icon="inline-start" />
        Удалить проект
      </Button>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title={confirmTitle}
        description="Удалятся все песни, этапы, тексты, обложки и заметки проекта."
        confirmLabel="Удалить навсегда"
        isBusy={isRemoving}
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
