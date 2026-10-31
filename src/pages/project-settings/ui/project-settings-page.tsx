import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectAvatar, ProjectDirection } from '@/entities/project';
import { InlineTitle } from '@/features/mentions';
import { ProjectLinksEditor } from '@/features/project-links';
import { MembersPicker } from '@/features/project-members';
import {
  PageHeader,
  Loading,
  Section,
  Button,
  ConfirmDialog,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui';
import { PromoTemplate } from '@/widgets/promo-template';
import { TITLE_MAX_LENGTH } from '../constants/project-settings';
import { useDeleteProject } from '../hooks/use-delete-project';
import { useMembers } from '../hooks/use-members';
import { useProjectAvatarEditor } from '../hooks/use-project-avatar-editor';
import { useProjectSettingsPage } from '../hooks/use-project-settings-page';
import { useSettingsTab } from '../hooks/use-settings-tab';
import type {
  ProjectAvatarEditorProps,
  MembersProps,
  DeleteProjectProps,
} from '../types/project-settings';
import { DirectionsSettings } from './directions-settings';
import { Template } from './template';

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

  const { tab, onTabChange } = useSettingsTab(projectId);

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
        <Tabs
          value={tab}
          onValueChange={onTabChange}
          className="max-w-3xl gap-6"
        >
          <TabsList className="h-10 bg-groove">
            <TabsTrigger
              value="general"
              className="px-4 data-[state=active]:bg-panel data-[state=active]:text-ink data-[state=active]:shadow-sm"
            >
              Общее
            </TabsTrigger>
            <TabsTrigger
              value="music"
              className="px-4 data-[state=active]:bg-panel data-[state=active]:text-ink data-[state=active]:shadow-sm"
            >
              Музыка
            </TabsTrigger>
            <TabsTrigger
              value="video"
              className="px-4 data-[state=active]:bg-panel data-[state=active]:text-ink data-[state=active]:shadow-sm"
            >
              Видео
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="general"
            className="flex flex-col gap-8 data-[state=inactive]:hidden"
          >
            <Section title="Участники">
              <Members project={project} isOwner={isOwner} />
            </Section>
            {isOwner && <DeleteProject project={project} />}
          </TabsContent>
          <TabsContent
            value="music"
            className="flex flex-col gap-8 data-[state=inactive]:hidden"
          >
            <DirectionsSettings
              project={project}
              isOwner={isOwner}
              direction={ProjectDirection.music}
            />
            {project.directions.includes(ProjectDirection.music) && (
              <>
                <div id="music-templates">
                  <Template projectId={projectId} isEditable={canEdit} />
                </div>
                {project.music_release_enabled && (
                  <>
                    <PromoTemplate projectId={projectId} canEdit={canEdit} />
                    <div id="music-links">
                      <Section title="Ссылки">
                        <ProjectLinksEditor
                          project={project}
                          isEditable={isOwner}
                          direction={ProjectDirection.music}
                        />
                      </Section>
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>
          <TabsContent
            value="video"
            className="flex flex-col gap-8 data-[state=inactive]:hidden"
          >
            <DirectionsSettings
              project={project}
              isOwner={isOwner}
              direction={ProjectDirection.video}
            />
            {project.directions.includes(ProjectDirection.video) && (
              <>
                <div id="video-templates">
                  <Template
                    projectId={projectId}
                    isEditable={canEdit}
                    direction={ProjectDirection.video}
                  />
                </div>
                <div id="video-links">
                  <Section title="Площадки">
                    <ProjectLinksEditor
                      project={project}
                      isEditable={isOwner}
                      direction={ProjectDirection.video}
                    />
                  </Section>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </>
  );
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
        className="text-led-red hover:bg-led-red/10 hover:text-led-red"
        onClick={onDeleteClick}
      >
        <Trash2 data-icon="inline-start" />
        Удалить проект
      </Button>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title={confirmTitle}
        description="Удалятся все материалы, этапы, публикации, файлы и заметки проекта."
        confirmLabel="Удалить навсегда"
        isBusy={isRemoving}
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
