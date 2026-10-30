import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectAvatar } from '@/entities/project';
import { InlineTitle } from '@/features/mentions';
import { ProjectLinksEditor } from '@/features/project-links';
import { MembersPicker } from '@/features/project-members';
import {
  PageHeader,
  Loading,
  Section,
  Button,
  ConfirmDialog,
} from '@/shared/ui';
import { PromoTemplate } from '@/widgets/promo-template';
import { TITLE_MAX_LENGTH } from '../constants/project-settings';
import { useDeleteProject } from '../hooks/use-delete-project';
import { useMembers } from '../hooks/use-members';
import { useProjectAvatarEditor } from '../hooks/use-project-avatar-editor';
import { useProjectSettingsPage } from '../hooks/use-project-settings-page';
import type {
  ProjectAvatarEditorProps,
  MembersProps,
  DeleteProjectProps,
} from '../types/project-settings';
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
        description="Удалятся все песни, этапы, тексты, обложки и заметки проекта."
        confirmLabel="Удалить навсегда"
        isBusy={isRemoving}
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
