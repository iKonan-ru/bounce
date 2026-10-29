import type { ReactNode } from 'react';
import type { Project, Roles } from '@/entities/project';
import type { StageTemplate, TemplateSubstep } from '@/entities/song';
import type { Crumb, PendingImage } from '@/shared/types';
import type { UseQueryResult } from '@tanstack/react-query';

/** Результат хука страницы настроек проекта */
export interface UseProjectSettingsPageResult {
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
export interface ProjectAvatarEditorProps {
  project: Project;
  isOwner: boolean;
}

/** Результат хука картинки проекта: что можно делать с картинкой */
export interface UseProjectAvatarEditorResult {
  onAvatarPick: ((file: File) => void) | undefined;
  onAvatarRemove: (() => void) | undefined;
  pendingAvatar: PendingImage | undefined;
}

/** Пропсы участников проекта */
export interface MembersProps {
  project: Project;
  isOwner: boolean;
}

/** Результат хука участников проекта */
export interface UseMembersResult {
  roles: Roles;
  isSaving: boolean;
  onRolesChange: (roles: Roles) => void;
}

/** Пропсы шаблона этапов */
export interface TemplateProps {
  projectId: string;
  isEditable: boolean;
}

/** Результат хука шаблона этапов */
export interface UseTemplateResult {
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
export interface TemplateItemProps {
  template: StageTemplate;
}

/** Пропсы строки этапа шаблона */
export interface TemplateRowProps {
  template: StageTemplate;
  /** Ручка перетаскивания */
  handle: ReactNode;
  isOpen: boolean;
  onToggle: (templateId: string) => void;
}

/** Результат хука строки этапа шаблона */
export interface UseTemplateRowResult {
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
export interface DeleteProjectProps {
  project: Project;
}

/** Результат хука удаления проекта */
export interface UseDeleteProjectResult {
  isConfirming: boolean;
  setIsConfirming: (isConfirming: boolean) => void;
  isRemoving: boolean;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}
